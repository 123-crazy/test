// Copyright (c) 2020 Siemens

/**
 * @module js/awLayoutService
 */
import app from 'app';
import AwHttpService from 'js/awHttpService';
import viewModelSvc from 'js/viewModelService';
import panelContentSvc from 'js/panelContentService';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import logger from 'js/logger';

let exports = {}; // eslint-disable-line no-invalid-this

// Data for all <aw-layout> elements in the DOM
export let layoutElementDataList = [];

// Event Bus Definitions - used to un-subscribe to events when all layout elements are removed
export let layoutNameChangeEventDef = null;
export let splitterUpdateEventDef = null;

// Constants: class names, file paths and event bus topic names
export let constants = {
    layoutIncludeClassName: 'aw-layout-include',
    nameChangeEventName: 'aw-layout-name-change',
    splitterUpdateEventName: 'aw-splitter-update',
    testModeFolderName: 'layouts'
};

// List of named 'when' conditions and test function names for that type of condition
// Condition names for containerWidthTest must match names in exports.containerWidthTest
// Condition names for cssMediaQueryTest must match names in class: layoutCSSMediaQueries
//
// These are only examples implementations. A project to define the set of supported
// out-of-the-box conditions and enhancements to the View Model to support responsive
// layouts is needed to defined that actual implementation of 'when' conditions.
export let namedCondtionTable = {
    large: 'containerWidthTest',
    medium: 'containerWidthTest',
    small: 'containerWidthTest',
    phone: 'cssMediaQueryTest',
    tablet: 'cssMediaQueryTest',
    desktop: 'cssMediaQueryTest'
};

// List of test function names and associated functions
export let responsiveTestFunctionTable = {
    containerWidthTest: function( conditionName, layoutElementData ) {
        return exports.containerWidthTest( conditionName, layoutElementData );
    },
    cssMediaQueryTest: function( conditionName ) {
        return exports.cssMediumQueryTest( conditionName );
    }
};

// Value returned by the CSS Media Query Element
// See CSS definition for class:layoutCSSMediaQueries
export let cssMediaQueryValue = null;

// Test Mode Flag (used by the Layout Elements Test Page)
// When in test mode the View and View Model files are found in the
// Test Harness layouts folder.
export let testModeFlag = false;

/**
 * Add Layout Element
 *
 * Process the 'when' attribute and establish the first layout to display for a given <aw-layout> element.
 * Add the element to the list of managed <aw-layout> elements. Also, if needed initialize Even Bus
 * handlers.
 *
 * @param {object} $scope - AngularJS scope for this <aw-layout> element
 * @param {object} elements - AngularJS/JQuery scoping elements for this element
 * @param {string} name - View / view model name
 * @param {string} when - When condition
 * @param {string} viewId - View / view model unique Id
 */
export let addLayoutElement = function( $scope, elements, name, when, viewId ) {
    // Initialize Event Handlers for All <aw-layout> elements
    if( exports.layoutNameChangeEventDef === null ) {
        exports.layoutNameChangeEventDef = eventBus.subscribe( exports.constants.nameChangeEventName, function(
            eventData ) {
            exports.nameChangeEventHandler( eventData );
        } );

        exports.splitterUpdateEventDef = eventBus.subscribe( exports.constants.splitterUpdateEventName, function(
            eventData ) {
            exports.splitterUpdateEventHandler( eventData );
        } );

        $scope.$on( 'windowResize', exports.windowResizeEventHandler );
    }

    // Set the common media query value shared by all layout elements
    exports.cssMediaQueryValue = exports.getCssMediaQueryValue();

    var defaultLayoutName = name;
    if( !defaultLayoutName ) {
        exports.reportError( '<aw-layout> element is missing the required "name" attribute' );
        defaultLayoutName = 'undefined';
    }

    // Parse the 'when' attribute and produce an array of: { conditionName, layoutName }
    var whenConditionList = exports.parseWhenAttribute( when );

    // Add this element to the list of managed <aw-layout> elements
    // and load the initial View Model and View for the element
    var layoutElementData = {
        scope: $scope,
        elements: elements,
        parentContainer: elements[ 0 ].parentElement,
        whenConditionList: whenConditionList,
        defaultLayoutName: defaultLayoutName,
        viewId: viewId,
        currentLayoutName: 'not-set-yet',
        viewModelURL: 'not-set-yet'
    };

    exports.layoutElementDataList.push( layoutElementData );

    exports.updateLayoutElement( layoutElementData );
};

/**
 * Remove Layout Element
 *
 * Remove layout elements that no longer exist in the current layout.
 *
 * @param {object} elements - AngularJS/JQuery scoping elements for this element
 */
export let removeLayoutElement = function( elements ) {
    var layoutElement = elements[ 0 ];
    var found = false;

    _.forEach( exports.layoutElementDataList, function( layoutElementData, key ) {
        if( layoutElementData.elements[ 0 ] === layoutElement ) {
            exports.layoutElementDataList.splice( key, 1 );
            found = true;

            // If there are no more layout elements in the DOM then un-subscribe to the events
            if( exports.layoutElementDataList.length < 1 ) {
                eventBus.unsubscribe( exports.layoutNameChangeEventDef );
                eventBus.unsubscribe( exports.splitterUpdateEventDef );

                exports.layoutNameChangeEventDef = null;
                exports.splitterUpdateEventDef = null;
            }

            return false; // return false to break out of forEach
        }
    } );

    // Element not found
    if( !found ) {
        exports.reportError( 'request to remove an <aw-layout> element could not find the element' );
    }
};

/**
 * Window Resize Event Handler
 *
 * Refresh the value of the CSS Media Query and update all layout elements.
 */
export let windowResizeEventHandler = function() {
    exports.cssMediaQueryValue = exports.getCssMediaQueryValue();
    exports.updateAllLayoutElements();
};

/**
 * Get Media Query Vales
 *
 * Method to return the current layout CSS Media Query value.
 *
 * @return {String} value obtain from CSS Media Queries
 */
export let getCssMediaQueryValue = function() {
    var value = null;
    var queryElement = document.querySelector( '.layoutCSSMediaQueries' );
    if( queryElement ) {
        var queryStyle = window.getComputedStyle( queryElement, ':before' );
        var queryValue = queryStyle.getPropertyValue( 'content' );
        // Some browsers return the value in quotes - so remove any quotes
        value = queryValue.replace( /'/g, '' );
    }

    return value;
};

/**
 * Splitter Update Event Handler
 *
 * Process 'when' conditions for all <aw-layout> elements to select layouts based on current CSS Media Query
 * values and area sizes.
 *
 * @param {object} eventData - object containing the elements that the splitter has updated. A structure of
 *            the form: { splitter, area1, area2 }
 */
export let splitterUpdateEventHandler = function() {
    // Note that to take advantage of the fact that area1 and area2 have been
    // updated we would have to scan the DOM structure from those starting points
    // to find all <aw-layout> elements in those branches. Just checking all
    // <aw-layout> elements is probably faster.
    exports.updateAllLayoutElements();
};

/**
 * Name Change Event Handler
 *
 * Update the default name for the given <aw-layout> element and possibly switch the layout to the new
 * default based on the 'when' conditions.
 *
 * @param {object} eventData - structure of the form: { layoutElement, newLayoutName }
 */
export let nameChangeEventHandler = function( eventData ) {
    var layoutElement = eventData.layoutElement;
    var newLayoutName = eventData.newLayoutName;
    var found = false;

    // Find the given layout element and update its default layout name
    // and then possibly update the selected layout for the element
    _.forEach( exports.layoutElementDataList, function( layoutElementData ) {
        if( layoutElementData.elements[ 0 ] === layoutElement ) {
            found = true;
            if( layoutElementData.defaultLayoutName !== newLayoutName ) {
                layoutElementData.defaultLayoutName = newLayoutName;
                exports.updateLayoutElement( layoutElementData );
            }
            return false; // return false to break out of forEach
        }
    } );

    // Element Not Found
    if( !found ) {
        exports.reportError( '<aw-layout> name change event did not find requested layout element' );
    }
};

/**
 * Update All Layout Elements
 *
 * Scan the list of layout elements and check their 'when' conditions using the current Media Query Value
 * and container area sizes/positions
 */
export let updateAllLayoutElements = function() {
    _.forEach( exports.layoutElementDataList, function( layoutElementData ) {
        exports.updateLayoutElement( layoutElementData );
    } );
};

/**
 * Update Layout Element
 *
 * Update the given <aw-layout> element based on its 'when' conditions using the current Media Query Value
 * and container area sizes/positions. When needed this will load the associated View Model and View for the
 * selected layout.
 *
 * @param {object} layoutElementData - Structure for a <aw-layout> element (see addLayoutElement)
 */
export let updateLayoutElement = function( layoutElementData ) {
    // Scan the 'when' conditions and select the current layout name
    var layoutName = exports.getConditionalLayoutName( layoutElementData );

    // If the layout name has change then load the View Model & View for the selected layout
    if( layoutName !== layoutElementData.currentLayoutName ) {
        layoutElementData.currentLayoutName = layoutName;
        layoutElementData.viewModelURL = 'not-set-yet';
        exports.loadAssociatedViewModelAndView( layoutElementData );
    }
};

/**
 * Load Associated View Model and View
 *
 * Load the current View Model and then the associated View
 *
 * @param {object} layoutElementData - Structure for a <aw-layout> element (see addLayoutElement)
 */
export let loadAssociatedViewModelAndView = function( layoutElementData ) {
    if( !layoutElementData.currentLayoutName ) {
        return;
    }

    var viewURL;
    var viewModelURL;
    var promise;
    var subPanelContext;
    if( exports.testModeFlag ) {
        var path = '/' + exports.constants.testModeFolderName + '/';

        viewModelURL = path + layoutElementData.currentLayoutName + '.json';
        viewURL = path + layoutElementData.currentLayoutName + '.html';

        promise = AwHttpService.instance.get( viewURL, {
            cache: true
        } ).then( function( viewResponse ) {
            var viewAndViewModelResponse = {};
            viewAndViewModelResponse.view = viewResponse.data;
            return AwHttpService.instance.get( viewModelURL, {
                cache: true
            } ).then( function( viewModelResp ) {
                viewAndViewModelResponse.viewModel = viewModelResp.viewModel;
                return viewAndViewModelResponse;
            } );
        } );
    } else {
        promise = panelContentSvc.getPanelContent( layoutElementData.currentLayoutName, layoutElementData.viewId );
        viewModelURL = app.getBaseUrlPath() + '/viewmodel/' + layoutElementData.currentLayoutName +
            'ViewModel.json';
        viewURL = app.getBaseUrlPath() + '/html/' + layoutElementData.currentLayoutName + 'View.html';
    }

    layoutElementData.viewModelURL = viewModelURL;

    promise.then( function( viewModelJson ) {
        //get subpanlecontext if it is on scope of aw-include
        if( !_.isEmpty( layoutElementData.scope.subPanelContext ) ) {
            subPanelContext = layoutElementData.scope.subPanelContext;
        }

        viewModelSvc.populateViewModelPropertiesFromJson( viewModelJson.viewModel, false, null, null, null, subPanelContext ).then( function( declViewModel ) { // Successful View Model Load
                viewModelSvc.setupLifeCycle( layoutElementData.scope, declViewModel );

                // Set the view name to trigger the ng-include directive to load the HTML
                // This will load the View associated with the View Model that just loaded.
                layoutElementData.scope.layoutViewName = viewModelJson.viewUrl || viewURL;
                layoutElementData.scope.currentLayoutName = layoutElementData.currentLayoutName;
            },
            function() { // This layout does not have an associated view model
                layoutElementData.viewModelURL = 'not-found';

                // The View Model did not load but we still need to load the view
                // Set the view name to trigger the ng-include directive to load the HTML
                layoutElementData.scope.layoutViewName = viewURL;
                layoutElementData.scope.currentLayoutName = layoutElementData.currentLayoutName;
            } );
    } );
};

/**
 * Parse When Attribute
 *
 * Parse an <aw-layout> 'when' attribute and return an array of structures of the form: { conditionName,
 * layoutName }. If the attribute is not defined then return null.
 *
 * @param {string} whenAttribute - 'when' attribute as defined in the <aw-layout> element
 * @return {array} - array of structures { conditionName, layoutName }
 */
export let parseWhenAttribute = function( whenAttribute ) {
    if( !whenAttribute ) {
        return null;
    }

    var whenConditionList = [];

    // Remove return characters and spaces
    var cleanString = whenAttribute.replace( /(\r\n|\n|\r)/gm, '' );
    cleanString = cleanString.replace( /\s/g, '' );

    // The when list is of the form:
    // conditionName1:layoutName1, conditionsName2:layoutName2, ...
    var whenList = cleanString.split( ',' );
    if( whenList.length < 1 ) {
        return null;
    }

    _.forEach( whenList, function( whenEntry ) {
        var nameSplit = whenEntry.split( ':' );
        if( nameSplit.length === 2 ) {
            if( nameSplit[ 0 ].length < 1 ) {
                exports.reportError( 'layout condition name is missing for: ' + whenEntry );
            } else if( nameSplit[ 1 ].length < 1 ) {
                exports.reportError( 'layout name is missing for: ' + whenEntry );
            } else {
                whenConditionList.push( {
                    conditionName: nameSplit[ 0 ],
                    layoutName: nameSplit[ 1 ]
                } );
            }
        } else {
            exports.reportError( 'invalid when format: ' + whenEntry );
        }
    } );

    return whenConditionList;
};

/**
 * Get Conditional Layout Name
 *
 * Based on the 'when' conditions and current responsive values, return the layout name associated with the
 * first true condition, or return the default layout name
 *
 * @param {object} layoutElementData - Structure for a <aw-layout> element (see addLayoutElement)
 *
 * @return {String} Layout Name.
 */
export let getConditionalLayoutName = function( layoutElementData ) {
    var defaultLayoutName = layoutElementData.defaultLayoutName;
    if( layoutElementData.whenConditionList === null ) {
        return defaultLayoutName;
    }

    var whenConditionList = layoutElementData.whenConditionList;
    var layoutName = null;

    _.forEach( whenConditionList, function( whenCondition ) {
        var conditionName = whenCondition.conditionName;

        if( exports.conditionIsTrue( conditionName, layoutElementData ) ) {
            layoutName = whenCondition.layoutName;
            return false; // Return false to break out of forEach
        }
    } );

    // Return the found layout name or the default
    return layoutName ? layoutName : defaultLayoutName;
};

/**
 * Condition Is True
 *
 * For a given named condition execute the associated condition test and return the resulting boolean value.
 *
 * @param {string} conditionName - the named condition as given in the 'when' attribute
 * @param {object} layoutElementData - Structure for a <aw-layout> element (see addLayoutElement)
 *
 * @return {boolean} - true when the named condition is true
 */
export let conditionIsTrue = function( conditionName, layoutElementData ) {
    var testFunctionName = exports.namedCondtionTable[ conditionName ];
    if( !testFunctionName ) {
        exports.reportError( 'invalid when condition name: ' + conditionName );
        return false;
    }

    var testFunction = exports.responsiveTestFunctionTable[ testFunctionName ];
    if( !testFunction ) {
        exports.reportError( 'invalid test function name: ' + testFunctionName );
        return false;
    }

    return testFunction( conditionName, layoutElementData );
};

/**
 * Container Width Test
 *
 * Test the current container size against a set of breakpoints and return true if the container width is
 * greater than the breakpoint for the given named condition
 *
 * @param {string} conditionName - the named condition as given in the 'when' attribute
 * @param {object} layoutElementData - Structure for a <aw-layout> element (see addLayoutElement)
 *
 * @return {boolean} - true when the named condition is true
 */
export let containerWidthTest = function( conditionName, layoutElementData ) {
    // Breakpoints are defined for the container width in px
    var layoutBreakpoints = {
        large: 1500,
        medium: 1000,
        small: 500
    };

    var breakPointValue = layoutBreakpoints[ conditionName ];
    var testValue = layoutElementData.parentContainer.clientWidth;

    if( !breakPointValue ) {
        exports.reportError( 'invalid condition name: ' + conditionName );
        return false;
    }

    return testValue > breakPointValue;
};

/**
 * CSS Media Query Test
 *
 * @param {string} conditionName - the named condition as given in the 'when' attribute
 *
 * @return {boolean} - true when the named condition is true
 */
export let cssMediumQueryTest = function( conditionName ) {
    if( !exports.cssMediaQueryValue ) {
        exports.reportError( 'CSS Media Query element is missing for aw-layout elements' );
    }
    return conditionName === exports.cssMediaQueryValue;
};

/**
 * Report a usage error.
 *
 * @param {string} errorMessage - error to report.
 */
export let reportError = function( errorMessage ) {
    logger.warn( 'awLayoutService:' + errorMessage );
};

exports = {
    layoutElementDataList,
    layoutNameChangeEventDef,
    splitterUpdateEventDef,
    constants,
    namedCondtionTable,
    responsiveTestFunctionTable,
    cssMediaQueryValue,
    testModeFlag,
    addLayoutElement,
    removeLayoutElement,
    windowResizeEventHandler,
    getCssMediaQueryValue,
    splitterUpdateEventHandler,
    nameChangeEventHandler,
    updateAllLayoutElements,
    updateLayoutElement,
    loadAssociatedViewModelAndView,
    parseWhenAttribute,
    getConditionalLayoutName,
    conditionIsTrue,
    containerWidthTest,
    cssMediumQueryTest,
    reportError
};
export default exports;
/**
 * This service provides methods required by the <aw-layout> element and is used for loading View Models (JSON files
 * loaded by viewModelService.js) and then to trigger the loading of the associated View (HTML files loaded by
 * AngularJS ng-include directive).
 *
 * It also provides event handlers required to implement the 'when' attribute.
 *
 * @memberof NgServices
 * @member awLayoutService
 *
 * @param {AwHttpService.instance} AwHttpService.instance - Service to use.
 * @param {viewModelService} viewModelSvc - Service to use.
 * @param {panelContentService} panelContentSvc - Service to use.
 */
app.factory( 'awLayoutService', () => exports );
