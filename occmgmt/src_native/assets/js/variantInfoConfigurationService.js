// @<COPYRIGHT>@
// ==================================================
// Copyright 2017.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/variantInfoConfigurationService
 */
import app from 'app';
import appCtxSvc from 'js/appCtxService';
import uwPropertyService from 'js/uwPropertyService';
import omStateHandler from 'js/occurrenceManagementStateHandler';
import viewModelObjectService from 'js/viewModelObjectService';
import tcViewModelObjectService from 'js/tcViewModelObjectService';
import endItemUnitEffectivityService from 'js/endItemUnitEffectivityConfigurationService';
import aceStructureConfigurationService from 'js/aceStructureConfigurationService';
import localeService from 'js/localeService';
import $ from 'jquery';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import occmgmtBackingObjProviderSvc from 'js/occmgmtBackingObjectProviderService';
import AwPromiseService from 'js/awPromiseService';
import cdm from 'soa/kernel/clientDataModel';
import soaService from 'soa/kernel/soaService';
import _localeSvc from 'js/localeService';
import messagingSvc from 'js/messagingService';
import TcSessionData from 'js/TcSessionData';
import dataManagementSvc from 'soa/dataManagementService';


var exports = {};

var productContextInfo = null;
var _defaultVariantRule = null;
var _customVariantRule = null;
var _isSeparatorAdded = false;
var _data = null;
var _eventSubDefs = [];

var populateProductContextInfo = function( data ) {
    aceStructureConfigurationService.populateContextKey( data );
    var context = data.contextKeyObject;
    if( context ) {
        if( context.productContextInfo && productContextInfo !== context.productContextInfo ) {
            // A change in ProductContext doesn't imply a change in product.
            // Check if the product has changed and fire an event.
            // The custom variant panel needs to react to this event.
            if( productContextInfo !== null &&
                productContextInfo.props.awb0Product !== null &&
                productContextInfo.props.awb0Product.dbValues[ 0 ] !== context.productContextInfo.props.awb0Product.dbValues[ 0 ] ) {
                eventBus.publish( 'ConfiguratorContextContainerChangedEvent' );
            }

            productContextInfo = context.productContextInfo;
            appCtxSvc.unRegisterCtx( 'svrOwningItemToRender' );
        }
    } else {
        productContextInfo = null;
    }
};

var populateOpenedProduct = function( data ) {
    aceStructureConfigurationService.populateContextKey( data );
    var context = data.contextKeyObject;
    if( context ) {
        var productContextInfo = context.productContextInfo;
        if( productContextInfo ) {
            data.openProduct = productContextInfo.props.awb0Product;
        }
    }
};

var populateReadOnlyFeaturesInfo = function( data ) {
    appCtxSvc.ctx.variantRule = appCtxSvc.ctx.variantRule || {};
    appCtxSvc.ctx.variantRule.isVariantRuleFeatureReadOnly = data.contextKeyObject.readOnlyFeatures ? data.contextKeyObject.readOnlyFeatures.Awb0VariantFeature : false;
};

var getSVROwningItemFromProductContextInfo = function() {
    if( productContextInfo ) {
        var svrOwningItem = productContextInfo.props.awb0VariantRuleOwningRev;
        if( !svrOwningItem || svrOwningItem.isNulls && svrOwningItem.isNulls !== true ) {
            svrOwningItem = productContextInfo.props.awb0Product;
        }
        return svrOwningItem;
    }
};

var getOpenedProductUIDFromProductContextInfo = function() {
    if( productContextInfo ) {
        return productContextInfo.props.awb0Product.dbValues[ 0 ];
    }
};

var handleSVROwningItemChangeIfThePanelIsGettingReInitialized = function( data, svrOwningItemToRender ) {
    if( data && svrOwningItemToRender ) {
        var svrOwningItemUID = svrOwningItemToRender.uid;
        if( svrOwningItemUID === getOpenedProductUIDFromProductContextInfo() ) {
            svrOwningItemUID = null;
        }
        var eventData = {
            svrOwningItem: {
                uid: svrOwningItemUID
            },
            variantRule: null,
            viewKey: data.viewKey
        };
        eventBus.publish( 'awConfigPanel.variantInfoChanged', eventData );
    }
    appCtxSvc.unRegisterCtx( 'svrOwningItemSelected' );
};

var updatePanelWithSVROwningItemToRender = function( svrOwningItemToRender ) {
    if( svrOwningItemToRender ) {
        appCtxSvc.updateCtx( 'svrOwningItemToRender', svrOwningItemToRender );
    }
};

var isClassicVariantsSupported = function() {
    var supportedFeatures = omStateHandler.getSupportedFeatures();
    if( supportedFeatures.Awb0SupportsClassicVariantsRule ) {
        return true;
    }
    return false;
};

export let updatePartialCtx = function( path, value ) {
    appCtxSvc.updatePartialCtx( path, value );
};

var newSVROwningItemSelected = function() {
    return appCtxSvc.getCtx( 'svrOwningItemSelected' );
};

var populateSVROwningItems = function( data ) {
    if( data ) {
        var svrOwningItemToRender = newSVROwningItemSelected();
        if( svrOwningItemToRender ) {
            handleSVROwningItemChangeIfThePanelIsGettingReInitialized( data, svrOwningItemToRender );
            updatePanelWithSVROwningItemToRender( svrOwningItemToRender );
        } else {
            var svrOwningItemFromPCI = getSVROwningItemFromProductContextInfo();
            updatePanelWithSVROwningItemToRender( svrOwningItemFromPCI );
        }
    }
};

var convertVariantRulesIntoVMProperty = function( productContextInfoModelObject ) {
    var variantRuleVMProperties = [];
    for( var i = 0; i < productContextInfoModelObject.props.awb0VariantRules.dbValues.length; i++ ) {
        var variantRuleVMProperty = uwPropertyService.createViewModelProperty(
            productContextInfoModelObject.props.awb0VariantRules.dbValues[ i ],
            productContextInfoModelObject.props.awb0VariantRules.uiValues[ i ], 'STRING',
            productContextInfoModelObject.props.awb0VariantRules.dbValues[ i ], '' );
        variantRuleVMProperty.uiValue = productContextInfoModelObject.props.awb0VariantRules.uiValues[ i ];
        //Set an index for applied rules. This index will be used to determine the index of clicked rule link in case of overlay.
        //This will be helpful when user has applied the same rule multiple times and we want to determine which link of the rule has been clicked.
        variantRuleVMProperty.ruleIndex = i;
        variantRuleVMProperties[ i ] = variantRuleVMProperty;
    }

    return variantRuleVMProperties;
};

var getVariantRuleFromProductContextInfo = function() {
    if( productContextInfo ) {
        if( omStateHandler.isFeatureSupported( 'Awb0ConfiguredByProximity' ) ) {
            // Create Configured by Proximity text to display if Structure is configured by proximity
            var resource = 'OccurrenceManagementConstants';
            var localeTextBundle = localeService.getLoadedText( resource );
            var configuredByProximityName = localeTextBundle.configuredByProximityVariantName;
            var validOverlayVMProperty = uwPropertyService.createViewModelProperty(
                configuredByProximityName,
                configuredByProximityName, 'STRING',
                configuredByProximityName, '' );
            validOverlayVMProperty.uiValue = configuredByProximityName;
            validOverlayVMProperty.ruleIndex = 0;
            return [ validOverlayVMProperty ];
        }
        var currentVariantRules = productContextInfo.props.awb0VariantRules;
        if( currentVariantRules && currentVariantRules.dbValues && currentVariantRules.dbValues.length > 0 ) {
            return convertVariantRulesIntoVMProperty( productContextInfo );
        }
    }
};

var getDefaultVariantRule = function( data ) {
    if( data ) {
        return _.clone( data.defaultVariantRule, true );
    }
};

var populateVariantRule = function( data ) {
    if( data ) {
        var currentVariantRules = getVariantRuleFromProductContextInfo();
        appCtxSvc.ctx.variantRule = appCtxSvc.ctx.variantRule || {};
        if( !currentVariantRules || !currentVariantRules[ 0 ].uiValue ) {
            currentVariantRules = [];
            var defaultVariantRule = getDefaultVariantRule( data );
            if( defaultVariantRule ) {
                defaultVariantRule.ruleIndex = 0;
            }
            currentVariantRules[ 0 ] = defaultVariantRule;
            appCtxSvc.ctx.variantRule.showOverlayCommand = false;
        } else {
            appCtxSvc.ctx.variantRule.showOverlayCommand = true;
        }
        data.appliedVariantRules = currentVariantRules;
    }
};

export let updateCurrentVariantRule = function( data, eventData ) {
    if( data && data.appliedVariantRules && eventData.selectedObject && eventData.index !== undefined ) {
        data.appliedVariantRules.splice( eventData.index, 1, eventData.selectedObject.props.object_string );
        appCtxSvc.updatePartialCtx( 'aceActiveContext.context.transientRequestPref.userGesture', 'VARIANT_RULE_CHANGE' );
    }
};

/**
 * Get SVROwningItems
 */
export let getSVROwningItems = function() {
    var svrOwningItemToRender = appCtxSvc.getCtx( 'svrOwningItemToRender' );
    if( svrOwningItemToRender ) {
        var svrOwningItems = [];
        svrOwningItems.push( svrOwningItemToRender );
        return svrOwningItems;
    }
};

var clearDataProviderCache = function( data ) {
    if( data && data.dataProviders && data.dataProviders.getAllVariantRules ) {
        data.dataProviders.getAllVariantRules.viewModelCollection.clear();
        data.dataProviders.getAllVariantRules.selectedObjects = [];
    }
};

export let addNewVariantRule = function( data ) {
    if( data.appliedVariantRules && data.newVariantRule ) {
        data.newVariantRule.ruleIndex = data.appliedVariantRules.length;
        data.appliedVariantRules.push( data.newVariantRule );
        appCtxSvc.ctx.variantRule = appCtxSvc.ctx.variantRule || {};
        appCtxSvc.ctx.variantRule.showOverlayCommand = false;
    }
};

/**
 * Fires the event to navigate to the 'Custom Variant panel'
 */
export let showCustomVariantPanel = function( variantRuleToEdit ) {
    appCtxSvc.unRegisterCtx( 'variantConfigContext' );
    if( variantRuleToEdit !== undefined && variantRuleToEdit !== null ) {
        variantRuleToEdit = viewModelObjectService.createViewModelObject( variantRuleToEdit );
    }

    // Set initial variant rule
    var variantConfigContext = {};
    if( variantRuleToEdit ) {
        variantConfigContext = {
            initialVariantRule: variantRuleToEdit
        };
    }

    // Register variant context
    variantConfigContext.guidedMode = true;
    variantConfigContext.customVariantPanelInitializing = true;
    // Fire event to launch 'Custom variant panel'

    appCtxSvc.registerCtx( 'variantConfigContext', variantConfigContext );

    var panelName = 'Pca0DefineCustomVariantRule';
    if( isClassicVariantsSupported() ) {
        panelName = 'Awb0DefineClassicVariantRule';
        appCtxSvc.unRegisterCtx( 'classicCfgContext' );
        appCtxSvc.registerCtx( 'classicCfgContext', {} );
    }

    //Destroy the sub panel contents before launching the panel. Ideally this should have been done by the framework.
    var subPanelContent = $( 'form[panel-id=' + panelName + ']' );
    if( subPanelContent.scope() ) {
        // Destroying scope on subpanel scope will in-turn clean up all the child scopes.
        subPanelContent.scope().$destroy();
    }
    var context = {
        destPanelId: panelName,
        recreatePanel: true,
        supportGoBack: false
    };
    eventBus.publish( 'awPanel.navigate', context );
};

/**
 * This API evaluates variant rules to apply while applying the custom configuration and returns the list of
 * variant rule UIDs
 */
export let getVariantRulesToApply = function() {
    //Get the current applied rule list
    var currentAppliedVRs = productContextInfo.props.awb0VariantRules.dbValues;
    var variantRules = currentAppliedVRs;
    var variantConfigContext = appCtxSvc.getCtx( 'variantConfigContext' );
    var index;

    // In case of classic variants, we do not support multiple variant rules like PCA
    // so add only one variant rule.
    if( isClassicVariantsSupported() ) {
        if( variantConfigContext.customVariantRule ) {
            variantRules[ 0 ] = variantConfigContext.customVariantRule.uid;
        } else {
            if( variantConfigContext.initialVariantRule !== undefined ) {
                variantRules[ 0 ] = variantConfigContext.initialVariantRule.uid;
            }
        }
        return variantRules;
    }

    //If Custom variant panel was opened with an initial variant rule then replace the initial variant rule in awb0VariantRules
    //with newly created custom variant rule
    if( variantConfigContext.initialVariantRule !== undefined ) {
        var initialVariantRuleUID = variantConfigContext.initialVariantRule.uid;
        index = variantRules.indexOf( initialVariantRuleUID ) !== -1 ? variantRules
            .indexOf( initialVariantRuleUID ) : variantRules.length;
    } else {
        index = variantRules.length;
    }
    if( variantConfigContext.customVariantRule ) {
        variantRules[ index ] = variantConfigContext.customVariantRule.uid;
    } else {
        if( variantConfigContext.initialVariantRule !== undefined ) {
            variantRules[ index ] = variantConfigContext.initialVariantRule.uid;
        }
    }
    return variantRules;
};

/**
 * Initialize the Variant Info Configuration Section
 */
export let getInitialVariantConfigurationData = function( data ) {
    if( data ) {
        populateProductContextInfo( data );
        if( productContextInfo ) {
            populateReadOnlyFeaturesInfo( data );
            populateVariantRule( data );
            populateOpenedProduct( data );
            if( data.defaultVariantRule ) {
                _defaultVariantRule = data.defaultVariantRule.propertyDisplayName;
            }
            if( data.customVariantRule ) {
                _customVariantRule = data.customVariantRule.propertyDisplayName;
            }
            clearDataProviderCache( data );
            if( _data !== data ) {
                _data = data;
            }
        }
    }
};

/**
 * Initialize SVR Owning end items Section
 *
 * @param {Object} data - The 'data' object from viewModel.
 */
export let initSVROwningItems = function( data ) {
    if( data ) {
        populateProductContextInfo( data );
        if( productContextInfo ) {
            populateSVROwningItems( data );
            eventBus.publish( 'configPanel.revealSVROwningItems' );
        }
    }
};

/**
 * Clears the current saved variant selection
 */
export let clearVariantConfigurationData = function( data ) {
    if( data ) {
        clearDataProviderCache( data );
        eventBus.publish( 'configPanel.revealSVROwningItems' );
        if( _data !== data ) {
            _data = data;
        }
    }
};

/**
 * Update Config Items
 */
export let updateConfigItems = function( newItemSelected ) {
    if( newItemSelected ) {
        appCtxSvc.registerCtx( 'svrOwningItemSelected', newItemSelected );
    }
};

export let processSVROwningItems = function( response ) {
    if( response.partialErrors || response.ServiceData && response.ServiceData.partialErrors ) {
        return response;
    }

    var svrOwningItems = endItemUnitEffectivityService
        .populateEndItemsOrSVROwningItems( response.preferredVarRuleOwningObjects );
    svrOwningItems = endItemUnitEffectivityService.addOpenObjectAsPreferredIfApplicable( svrOwningItems,
        response.addOpenObjAsPreferredEndItem );
    return svrOwningItems;
};

/**
 * Find Subtype Business Object
 */
export let fetchSubBOTypesForVariant = function( data ) {
    if( !data.subBusinessObjects || data.subBusinessObjects.length === 0 ) {
        eventBus.publish( 'searchSVROwningItems.fetchSubBOTypes' );
    } else {
        eventBus.publish( 'searchSVROwningItems.doSearch' );
    }
};

var addSeparatorToVariantRulesList = function( response, variantRules, increment ) {
    //create separator object with marker information
    var separatorObject = tcViewModelObjectService.createViewModelObjectById( 'separatorObject' );
    separatorObject.marker = response.marker + increment;
    separatorObject.props.object_string = {
        dbValue: ''
    };
    //add separator object to response to render separator in list
    if( !_isSeparatorAdded && response.marker >= 0 && response.marker <= response.endIndex ) {
        variantRules.splice( response.marker, 0, separatorObject );
        response.totalFound++;
        _isSeparatorAdded = true;
    }
};

var showFilteredVariantRules = function( response, variantRules, customRuleSupported ) {
    if( response.endIndex <= 20 ) {
        var matchedItem = null;
        var allVariants = tcViewModelObjectService.createViewModelObjectById( '_defaultVariantRule' );

        allVariants.props.object_string = uwPropertyService.createViewModelProperty(
            _defaultVariantRule,
            _defaultVariantRule, 'STRING',
            _defaultVariantRule, '' );

        allVariants.cellHeader1 = _defaultVariantRule;

        var customRule = tcViewModelObjectService.createViewModelObjectById( '_customVariantRule' );

        customRule.props.object_string = uwPropertyService.createViewModelProperty(
            _customVariantRule,
            _customVariantRule, 'STRING',
            _customVariantRule, '' );

        customRule.cellHeader1 = _customVariantRule;

        // No matching rule with search string
        if( response.totalFound === 0 && !_.isUndefined( _data ) && !_.isUndefined( _data.variantRuleFilterBox ) && _data.variantRuleFilterBox.dbValue ) {
            // Show rule based on matching search criteria
            if( _.startsWith( _defaultVariantRule.toUpperCase(), _data.variantRuleFilterBox.dbValue
                    .toUpperCase() ) ) {
                matchedItem = allVariants;
            } else if( customRuleSupported &&
                _.startsWith( _customVariantRule.toUpperCase(), _data.variantRuleFilterBox.dbValue
                    .toUpperCase() ) ) {
                matchedItem = customRule;
            }
        }

        var increment = 1;
        if( matchedItem ) {
            variantRules.splice( 0, 0, matchedItem );
        } else {
            if( customRuleSupported ) {
                // add 'custom' rule at 1st position in response
                variantRules.splice( 0, 0, customRule );
                //add all variants object at 2nd position in response
                variantRules.splice( 1, 0, allVariants );
                increment = 2;
            } else {
                //add all variants object at 1st position in response
                variantRules.splice( 0, 0, allVariants );
            }
        }
        response.totalFound += increment;
    }
};

/**
 * Process the response from Server
 */
export let processVariantRules = function( response ) {
    if( response.partialErrors || response.ServiceData && response.ServiceData.partialErrors ) {
        return response;
    }
    var variantRules = [];
    if( response.endIndex <= 20 ) {
        _isSeparatorAdded = false;
    }

    var increment = 1;
    var customRuleSupported = isClassicVariantsSupported() || omStateHandler.isFeatureSupported( 'Awb0SupportsCustomVariantRule' );

    //Temporary check. Will be removed once we start supporting custom rule panel launch from header or when we convert this directive to view/viewmodel
    var directiveInstances = $( 'aw-link-with-popup[prop=\'variantRule\']' );

    _.forEach( directiveInstances, function( instance ) {
        var popup = instance.getAttribute( 'data-popup-id' );
        if( popup && popup !== 'null' ) {
            var parent = $( instance ).parents( 'aw-header-contribution' );
            if( parent.length && parent[ 0 ].nodeName === 'AW-HEADER-CONTRIBUTION' ) {
                return customRuleSupported = false;
            }
        }
    } );

    if( customRuleSupported ) {
        increment = 2;
    }

    // Add separator
    if( response.variantRules ) {
        variantRules = response.variantRules;
        addSeparatorToVariantRulesList( response, variantRules, increment );
    }
    // Show filtered items based on search string
    showFilteredVariantRules( response, variantRules, customRuleSupported );

    return variantRules;
};

/**
 * Evaluate starting index of variant rule data provider
 *
 * @param {Object} dp - The variant rule data provider object.
 * @return {integer} start index for variant rule data provider
 */
export let evaluateStartIndexForVariantRuleDataProvider = function( dp ) {
    if( dp.startIndex === 0 ) {
        return 0;
    }

    var isMarkerPresent = false;

    for( var i = 0; i < dp.viewModelCollection.loadedVMObjects.length; i++ ) {
        if( dp.viewModelCollection.loadedVMObjects[ i ].marker ) {
            isMarkerPresent = true;
            break;
        }
    }

    var extraObjectsInList = 1; // When only 'No Variant Rule' is present in list
    if( isMarkerPresent ) {
        extraObjectsInList++;
    }
    if( omStateHandler.isFeatureSupported( 'Awb0SupportsCustomVariantRule' ) ) {
        extraObjectsInList++;
    }

    return dp.viewModelCollection.loadedVMObjects.length -
        extraObjectsInList;
};

export let showVariantTooltip = function( vmo, data ) {
    //  Update tooltip label with object string of vmo
    if( vmo.props.awb0VariantFormula && !_.isEmpty( vmo.props.awb0VariantFormula.dbValues[ 0 ] ) ) {
        data.variantTooltip.uiValue = vmo.props.awb0VariantFormula.dbValues[ 0 ];
    } else {
        data.variantTooltip.uiValue = vmo.props.awb0HasVariant.propertyDisplayName;
    }
};

var isCurrentVariantRuleBeingSelected = function( eventData ) {
    if( eventData.scope.prop && eventData.scope.prop.dbValue.toUpperCase() === eventData.scope.data.subPanelContext.variantRule.propertyDisplayName.toUpperCase() ) {
        return eventData.scope.data.subPanelContext.variantRule;
    }
};

var handleNoVariantRuleSelected = function( eventData, data ) {
    var activeContext = appCtxSvc.getCtx( 'aceActiveContext.context' );
    //Get the current applied rule list
    var currentAppliedVRs = activeContext.productContextInfo.props.awb0VariantRules.dbValues;
    var variantRules = currentAppliedVRs;

    //If there is only 1 rule applied then set the appliedVRs to null
    if( currentAppliedVRs.length === 1 ) {
        variantRules = null;
    } else { //Remove the rule from currently applied rule list
        variantRules.splice( data.subPanelContext.variantRule.ruleIndex, 1 );
    }
    eventData.variantRules = variantRules;
};

var updateAppliedRulesList = function( eventData, data ) {
    var activeContext = appCtxSvc.getCtx( 'aceActiveContext.context' );
    //Get the current applied rule list
    var currentAppliedVRs = activeContext.productContextInfo.props.awb0VariantRules.dbValues;
    var variantRules = currentAppliedVRs;
    variantRules[ data.subPanelContext.variantRule.ruleIndex ] = eventData.selectedObjects[ 0 ].uid;

    eventData.variantRules = variantRules;
};

var setVariantRule = function( eventData ) {
    eventBus.publish( 'awConfigPanel.variantInfoChanged', eventData );
    eventBus.publish( 'awPopupWidget.close' );
};

var setSvrOwningItemforVariantEff = function( eventData, data ) {
    var svrowningitem = appCtxSvc.getCtx( 'svrOwningItemToRender' );
    if( !svrowningitem ) {
        svrowningitem = appCtxSvc.getCtx( 'aceActiveContext.context.productContextInfo' ).props.awb0VariantRuleOwningRev;
    }
    eventData.svrOwningItem = {
        uid: svrowningitem.dbValues[ 0 ]
    };
    if( eventData.svrOwningItem !== null ) {
        populateOpenedProduct( data );
        var productUid = data.openProduct;
        var itemRevOwningVarRuleIsSameAsProduct = productUid.dbValues[ 0 ] === eventData.svrOwningItem.uid;
        if( eventData.variantRules === null && itemRevOwningVarRuleIsSameAsProduct ) {
            eventData.svrOwningItem = null;
        }
    }
    var indexOfVarRule;
    if( _.get( eventData, 'scope.data.subPanelContext' ) ) {
        indexOfVarRule = eventData.scope.data.subPanelContext.indexOfRule;
    }

    setVariantRule( {
        svrOwningItem: eventData.svrOwningItem,
        variantRules: eventData.variantRules,
        selectedObject: eventData.selectedObjects[ 0 ],
        index: indexOfVarRule,
        viewKey: data.viewKey
    } );
};

export let updateVariantRule = function( eventData, data ) {
    if( eventData.selectedObjects.length ) {
        if( eventData.selectedObjects[ '0' ].marker >= 0 ) { // Handle Separator selected
            exports.selectVariantRule();
        } else if( eventData.selectedObjects[ '0' ].props.object_string.dbValue === data.defaultVariantRule.propertyDisplayName ) { // Handle "No Variant Rule" variant rule selected
            //When user clicks on 'New' and selects 'No Variant Rule', then 'New' will be removed from the list and overlay command will be displayed
            if( data.subPanelContext.variantRule.propertyDisplayName === data.newVariantRule.propertyDisplayName ) {
                data.subPanelContext.appliedVariantRules.splice(
                    data.subPanelContext.variantRule.ruleIndex, 1 );
                appCtxSvc.ctx.variantRule = appCtxSvc.ctx.variantRule || {};
                appCtxSvc.ctx.variantRule.showOverlayCommand = true;
                eventBus.publish( 'awPopupWidget.close' );
            } else if( data.subPanelContext.variantRule.propertyDisplayName !== data.defaultVariantRule.propertyDisplayName ) { //User clicks on any applied rules and selects 'No Variant Rule'
                handleNoVariantRuleSelected( eventData, data );
                setSvrOwningItemforVariantEff( eventData, data );
            }
        } else if( eventData.selectedObjects[ '0' ].props.object_string.dbValue === data.customVariantRule.propertyDisplayName ) { // Handle "Custom" variant rule selected
            eventData.svrOwningItem = null;
            eventData.ruleToEdit = data.subPanelContext.variantRule;

            // Publish event to launch panel
            var selectedModelObj = appCtxSvc.getCtx( 'selected' );
            if( selectedModelObj ) {
                eventBus.publish( 'awConfigPanel.customVariantClicked', eventData );
            }
            data.isCustomVariantRuleApplied = true;
            eventBus.publish( 'awPopupWidget.close' );
        } else if( eventData.selectedObjects[ 0 ].uid &&
            data.subPanelContext.variantRule.dbValue !== eventData.selectedObjects[ 0 ].uid ) { // Handle variant rule selected
            updateAppliedRulesList( eventData, data );
            setSvrOwningItemforVariantEff( eventData, data );
        }
    } else { //Handle Current variant rule selected
        var selectedVariantRule = isCurrentVariantRuleBeingSelected( eventData );
        if( !data.isCustomVariantRuleApplied && selectedVariantRule ) {
            eventBus.publish( 'awPopupWidget.close' );
        }
    }
};

export let selectVariantRule = function( data, dataProvider ) {
    if( dataProvider.viewModelCollection.loadedVMObjects.length > 0 ) {
        //Find Index of current variant rule and select it
        if( data.subPanelContext.variantRule.dbValue ) {
            var indexOfCurrentRev = dataProvider.viewModelCollection.loadedVMObjects
                .map( function( x ) {
                    return x.uid;
                } ).indexOf( data.subPanelContext.variantRule.dbValue );
            if( indexOfCurrentRev >= 0 ) {
                dataProvider.changeObjectsSelection( indexOfCurrentRev,
                    indexOfCurrentRev, true );
            } else {
                //Deselect "Custom" Variant Rule from List.
                if( dataProvider.selectedObjects.length ) {
                    dataProvider.selectNone();
                }
            }
        } else if( data.subPanelContext.variantRule.propertyDisplayName === data.defaultVariantRule.propertyDisplayName ) { //Select "No Variant Rule" from List
            var indexOfAllRev = dataProvider.viewModelCollection.loadedVMObjects
                .map( function( x ) {
                    return x.props.object_string.dbValue;
                } ).indexOf( data.subPanelContext.variantRule.propertyDisplayName );

            dataProvider.changeObjectsSelection( indexOfAllRev,
                indexOfAllRev, true );
        } else if( data.subPanelContext.variantRule.propertyDisplayName === data.newVariantRule.propertyDisplayName && data.isCustomVariantRuleApplied ) {
            dataProvider.selectNone();
        }
    }
};

export let publishAddNewVariantRuleEvent = function() {
    eventBus.publish( 'awb0AddNewVariantRuleCmdEvent' );
};

/**
 * Async function to get the backing object's for input viewModelObject's.
 * viewModelObject's should be of type Awb0Element.
 * @param {Object} viewModelObjects - of type Awb0Element
 * @return {Promise} A Promise that will be resolved with the requested backing object's when the data is available.
 *
 */
 export let getBOMLineUid = function( viewModelObjects ) {
    let deferred = AwPromiseService.instance.defer();
    occmgmtBackingObjProviderSvc.getBackingObjects( viewModelObjects ).then( function( response ) {
            return deferred.resolve( response );
    } );
    return deferred.promise;
};

export let initialize = function() {
    _setupEventListeners();
};

var _setupEventListeners = function() {
    var tcMajor = TcSessionData.getTCMajorVersion();
    var tcMinor = TcSessionData.getTCMinorVersion();
    // If version is greater than 13.3 or 14.0, then set true
    if( tcMajor === 13 && tcMinor >= 3 || tcMajor >= 14 ) {
        _eventSubDefs.push( eventBus.subscribe( 'primaryWorkArea.selectionChangeEvent', function( eventData ) {
        let viewModelObjects = appCtxSvc.getCtx( 'selected' );
        var activeContext = appCtxSvc.getCtx( 'aceActiveContext' );
        if( !_.isUndefined( viewModelObjects.modelType ) ) {
            if( viewModelObjects.modelType.typeHierarchyArray.indexOf( 'Awb0ConditionalElement' ) > -1 &&
            !omStateHandler.isFeatureSupported( '4GStructureFeature' ) &&
            omStateHandler.isFeatureSupported( 'Awb0SupportsVariantConditionAuthoring' ) &&
            activeContext.context.activeTab.id === 'Awb0SupportsVariantConditionAuthoring' ) {
                var selectedObjs = eventData.dataProvider.getSelectedObjects();
                populateConsumerAppsDataInput( true, selectedObjs );
            }
        }
        } ) );

        // Subcribe to productContextChangedEvent This event with productChangedOnSelectionChange providertype is fired when PCI changes.
        _eventSubDefs.push( eventBus.subscribe( 'productContextChangedEvent', function( eventData ) {
            if( eventData && eventData.dataProviderActionType &&
                eventData.dataProviderActionType === 'productChangedOnSelectionChange' ) {
                    let viewModelObjects = appCtxSvc.getCtx( 'selected' );
                    var activeContext = appCtxSvc.getCtx( 'aceActiveContext' );
                    if( !_.isUndefined( viewModelObjects.modelType ) ) {
                        if( viewModelObjects.modelType.typeHierarchyArray.indexOf( 'Awb0ConditionalElement' ) > -1 &&
                        !omStateHandler.isFeatureSupported( '4GStructureFeature' ) &&
                        omStateHandler.isFeatureSupported( 'Awb0SupportsFullScreenVariantConfiguration' ) &&
                        activeContext.context.activeTab.id === 'Awb0SupportsFullScreenVariantConfiguration' ) {
                            populateConsumerAppsDataInput( true, null );
                        }
                    }
            }
        } ) );

        _eventSubDefs.push( eventBus.subscribe( 'configuratorVcaTable.gridLoaded', function() {
            let viewModelObjects = appCtxSvc.getCtx( 'selected' );
            let activeContext = appCtxSvc.getCtx( 'aceActiveContext' );
            if( !_.isUndefined( viewModelObjects.modelType ) ) {
                if( omStateHandler.isFeatureSupported( 'Awb0SupportsVariantConditionAuthoring' ) &&
                    !omStateHandler.isFeatureSupported( '4GStructureFeature' ) &&
                    viewModelObjects.modelType.typeHierarchyArray.indexOf( 'Awb0ConditionalElement' ) > -1 &&
                    activeContext.context.activeTab.id === 'Awb0SupportsVariantConditionAuthoring'
                    ) {
                        populateConsumerAppsDataInput( true, null );
                    }
            }
        } ) );

        _eventSubDefs.push( eventBus.subscribe( 'configuratorVcaTable.gridUnloaded', function() {
            let viewModelObjects = appCtxSvc.getCtx( 'selected' );
            if( !_.isUndefined( viewModelObjects.modelType ) ) {
                if( omStateHandler.isFeatureSupported( 'Awb0SupportsVariantConditionAuthoring' ) &&
                    !omStateHandler.isFeatureSupported( '4GStructureFeature' ) &&
                    viewModelObjects.modelType.typeHierarchyArray.indexOf( 'Awb0ConditionalElement' ) > -1 ) {
                        resetConsumerAppsData();
                    }
            }
        } ) );

        _eventSubDefs.push( eventBus.subscribe( 'Pca0VariantCondition.consumerAppsPostLoadAction', function( input ) {
        let viewModelObjects = appCtxSvc.getCtx( 'selected' );
        if( !_.isUndefined( viewModelObjects.modelType ) ) {
            if( omStateHandler.isFeatureSupported( 'Awb0SupportsVariantConditionAuthoring' ) &&
                !omStateHandler.isFeatureSupported( '4GStructureFeature' ) &&
                viewModelObjects.modelType.typeHierarchyArray.indexOf( 'Awb0ConditionalElement' ) > -1 ) {
                    populateContextToPerspectiveMap( input );
                }
        }
    } ) );
    }
};

export let destroy = function() {
    resetConsumerAppsData();
    _.forEach( _eventSubDefs, function( subDef ) {
        eventBus.unsubscribe( subDef );
    } );
    _eventSubDefs = [];
};

let ensureConfigContextAvailable = function( viewModelObjects, isSelectionChange ) {
    let deferred = AwPromiseService.instance.defer();
    let occmgmtConfigContext = appCtxSvc.getCtx( 'occmgmtConfigContext' );
    var parentHeirarchy = [];
    for( var idx in viewModelObjects ) {
        let currentObject = viewModelObjects[idx];
        while( currentObject.props.awb0Parent.dbValues[ 0 ] ) {
            var selectionsFound = false;
            let parentobject = cdm.getObject( currentObject.props.awb0Parent.dbValues[ 0 ] );
            if( occmgmtConfigContext.itemRevToConfigContextMap ) {
                let keys = Object.keys( occmgmtConfigContext.itemRevToConfigContextMap );
                _.forEach( keys, function( selection ) {
                    if( parentobject.props.awb0Archetype.dbValues[ 0 ] === selection && parentobject.type === 'Awb0Element' ) {
                        selectionsFound = true;
                        return false; // this works as break in lodash.
                    }
                } );
            }
            if ( !selectionsFound ) {
                var parentRevisionInput = {
                    uid:parentobject.props.awb0Archetype.dbValues[ 0 ]
                };
                parentHeirarchy.push( parentRevisionInput  );
            }
            currentObject = parentobject;
        }

        if( parentHeirarchy.length > 0 ) {
            var input = {
                objects: parentHeirarchy
            };
            appCtxSvc.updatePartialCtx( 'variantConditionContext.configContextFromConsumerApps', cdm.NULL_UID  );
            soaService.post( 'Core-2006-03-DataManagement', 'getProperties', input ).then(
                function( soaResponse ) {
                    let variantConditionContext = appCtxSvc.getCtx( 'variantConditionContext' );
                    var values = Object.values( soaResponse.modelObjects );
                    let parentItemHeirarchy = [];
                    let parentItemRevHeirarchy = [];
                    for ( var itemRev in input.objects ) {
                        _.forEach( values, function( selection ) {
                            if( input.objects[itemRev].uid === selection.uid ) {
                                if(!_.isUndefined( selection.props.items_tag ) && !_.isUndefined( selection.props.items_tag.dbValues)){
                                var parentItemInput = {                                   
                                       uid:selection.props.items_tag.dbValues[0]
                               };
                                parentItemHeirarchy.push( parentItemInput  );
                                parentItemRevHeirarchy.push( selection.uid );
                                return false; // this works as break in lodash.
                            }
                            }
                        } );
                    }
                    var input2 = {
                        objects: parentItemHeirarchy,
                        attributes: [ 'Smc0HasVariantConfigContext' ]
                    };
                    soaService.post( 'Core-2006-03-DataManagement', 'getProperties', input2 ).then(
                        function( soaResponse2 ) {
                            var configContext = null;
                            var parentItem = null;
                            for ( var idx in parentItemHeirarchy ) {
                                _.forEach( Object.values( soaResponse2.modelObjects ), function( selection ) {
                                    if( input2.objects[idx].uid === selection.uid ) {
                                        configContext = selection.props.Smc0HasVariantConfigContext.dbValues[0];
                                        parentItem = selection.uid;
                                        return false; // this works as break in lodash.
                                    }
                                } );
                                if( _.isUndefined( occmgmtConfigContext.itemRevToConfigContextMap ) ) {
                                    occmgmtConfigContext.itemRevToConfigContextMap = {};
                                }
                                occmgmtConfigContext.itemRevToConfigContextMap[parentItemRevHeirarchy[idx]] = configContext;
                                appCtxSvc.updatePartialCtx( 'occmgmtConfigContext.itemRevToConfigContextMap', occmgmtConfigContext.itemRevToConfigContextMap );
                            }
                            deferred.resolve( soaResponse2 );
                        }
                    );
                }
            );
        } else {
            deferred.resolve();
        }
    }
    return deferred.promise;
};

let getConfigContextForSOA = function( viewModelObjects ) {
    var currentEffectiveCC = cdm.NULL_UID;
    var oldEffectiveCC = cdm.NULL_UID;
    let occmgmtConfigContext = appCtxSvc.getCtx( 'occmgmtConfigContext' );

    for( var idx in viewModelObjects ) {
    let currentObject = viewModelObjects[idx];
        while( currentObject.props.awb0Parent.dbValues[ 0 ] ) {
            let parentobject = cdm.getObject( currentObject.props.awb0Parent.dbValues[ 0 ] );
            if( occmgmtConfigContext.itemRevToConfigContextMap ) {
                let keys = Object.keys( occmgmtConfigContext.itemRevToConfigContextMap );
                _.forEach( keys, function( selection ) {
                    if( parentobject.props.awb0Archetype.dbValues[0] === selection && !_.isUndefined( occmgmtConfigContext.itemRevToConfigContextMap[selection] ) ) {
                        currentEffectiveCC = occmgmtConfigContext.itemRevToConfigContextMap[parentobject.props.awb0Archetype.dbValues[ 0 ]];
                        return false;
                    }
                } );
            }
            if( currentEffectiveCC !== cdm.NULL_UID ) {
                break;
            }
            currentObject = parentobject;
        }
        if( currentEffectiveCC !== oldEffectiveCC && oldEffectiveCC !== cdm.NULL_UID ) {
            if( _localeSvc ) {
                _localeSvc.getTextPromise( 'OccurrenceManagementMessages' ).then(
                    function( textBundle ) {
                        messagingSvc.showInfo( textBundle.invalid_variant_condition_selection );
                    } );
                }
        }
        oldEffectiveCC = currentEffectiveCC;
    }

    if( currentEffectiveCC !== null ) {
    appCtxSvc.updatePartialCtx( 'variantConditionContext.configContextFromConsumerApps', currentEffectiveCC );
    }
};

let getPerspectiveInfoForSOAFromMap = function() {
    let configPerspective = cdm.NULL_UID;
    let occmgmtConfigContext = appCtxSvc.getCtx( 'occmgmtConfigContext' );
    let variantConditionContext = appCtxSvc.getCtx( 'variantConditionContext' );
    if( occmgmtConfigContext.configContextToPerspectiveMap ) {
        let keys = Object.keys( occmgmtConfigContext.configContextToPerspectiveMap );
        _.forEach( keys, function( selection ) {
            if( variantConditionContext.configContextFromConsumerApps === selection ) {
                configPerspective = occmgmtConfigContext.configContextToPerspectiveMap[variantConditionContext.configContextFromConsumerApps];
            }
        } );
    }
    appCtxSvc.updatePartialCtx( 'variantConditionContext.configPerspectiveFromConsumerApps', configPerspective );
};

export let populateConsumerAppsDataInput = function( isSelectionChange, viewModelObjects ) {
    let deferred = AwPromiseService.instance.defer();

    if( viewModelObjects === null ) {
        viewModelObjects = appCtxSvc.getCtx( 'mselected' );
    }
    if( !appCtxSvc.getCtx( 'occmgmtConfigContext' ) ) {
        var input = {};
        appCtxSvc.registerCtx( 'occmgmtConfigContext', input );
    }
    var selectedObjects = [];
    var bomLineUIDsToBeLoaded = [];
    getBOMLineUid( viewModelObjects ).then( function( response ) {
        var selectedObject = null;
        for( var i = 0; i < response.length; i++ ) {
                if( response ) {
                    bomLineUIDsToBeLoaded.push( response[i].uid );
                    selectedObject = {
                        uid:response[i].uid,
                        type:'unknownType'
                    };
                } else {
                    selectedObject = viewModelObjects[i];
                }
                selectedObjects.push( selectedObject );
            }
            var activeContext = appCtxSvc.getCtx( 'aceActiveContext' );
            if ( omStateHandler.isFeatureSupported( 'Awb0SupportsVariantConditionAuthoring' ) &&
                 activeContext.context.activeTab.id === 'Awb0SupportsVariantConditionAuthoring' ) {
                _.set( appCtxSvc, 'ctx.variantConditionContext.selectedObjectsFromConsumerApps', selectedObjects );
                _.set( appCtxSvc, 'ctx.variantConditionContext.allowConsumerAppsToLoadData', true );
                ensureConfigContextAvailable( viewModelObjects, isSelectionChange ).then( function() {
                    getConfigContextForSOA( viewModelObjects );
                    getPerspectiveInfoForSOAFromMap();
                    dataManagementSvc.loadObjects( bomLineUIDsToBeLoaded ).then( function( loadResponse ) {
                        let variantConditionContext = appCtxSvc.getCtx( 'variantConditionContext' );
                        let variantFormulaIsDirty = false;
                        const isTableEditing = appCtxSvc.getCtx( 'isVariantTableEditing' );
                        if( variantConditionContext ) {
                            variantFormulaIsDirty = variantConditionContext.variantFormulaIsDirty;
                        }
                        if( isSelectionChange && !variantFormulaIsDirty && !isTableEditing ) {
                            eventBus.publish( 'configuratorVcaTable.reload' );
                        }
                        deferred.resolve( loadResponse );
                    } );
                } );
            } else if ( omStateHandler.isFeatureSupported( 'Awb0SupportsFullScreenVariantConfiguration' ) &&
                        activeContext.context.activeTab.id === 'Awb0SupportsFullScreenVariantConfiguration' ) {
                //Update for Variant configuration view
                _.set( appCtxSvc, 'ctx.fscContext.configPerspective', '' );
                _.set( appCtxSvc, 'ctx.fscContext.selectedModelObjects', viewModelObjects );
                ensureConfigContextAvailable( viewModelObjects, isSelectionChange ).then( function() {
                    dataManagementSvc.loadObjects( bomLineUIDsToBeLoaded ).then( function( loadResponse ) {
                        if( isSelectionChange ) {
                            var fscContext = appCtxSvc.getCtx( 'fscContext' );
                            if ( fscContext && !fscContext.vrSyncPerformed ) {
                               eventBus.publish( 'Pca0FullScreenConfiguration.syncAppliedSVR' );
                            }
                            fscContext.vrSyncPerformed = false;
                            appCtxSvc.updateCtx( 'fscContext', fscContext );
                        }
                        deferred.resolve( loadResponse );
                    } );
                } );
            }
    } );
    return deferred.promise;
};

let populateContextToPerspectiveMap = function( configPerspective ) {
    let occmgmtConfigContext = appCtxSvc.getCtx( 'occmgmtConfigContext' );
    let variantConditionContext = appCtxSvc.getCtx( 'variantConditionContext' );
    if( _.isUndefined( occmgmtConfigContext.configContextToPerspectiveMap ) ) {
        occmgmtConfigContext.configContextToPerspectiveMap = {};
    }
   if( variantConditionContext.configContextFromConsumerApps ) {
       if( variantConditionContext.configContextFromConsumerApps !== cdm.NULL_UID ) {
           occmgmtConfigContext.configContextToPerspectiveMap[variantConditionContext.configContextFromConsumerApps] = configPerspective;
           appCtxSvc.updatePartialCtx( 'occmgmtConfigContext.configContextToPerspectiveMap', occmgmtConfigContext.configContextToPerspectiveMap );
       }
    }
    appCtxSvc.updatePartialCtx( 'variantConditionContext.configPerspectiveFromConsumerApps', configPerspective );
};

export let resetConsumerAppsData = function() {
    appCtxSvc.unRegisterCtx( 'variantConditionContext' );
};

/**
 * Variant Info Configuration service utility
 */

export default exports = {
    initialize,
    destroy,
    updatePartialCtx,
    getSVROwningItems,
    showCustomVariantPanel,
    getVariantRulesToApply,
    getInitialVariantConfigurationData,
    initSVROwningItems,
    clearVariantConfigurationData,
    updateConfigItems,
    processSVROwningItems,
    fetchSubBOTypesForVariant,
    processVariantRules,
    evaluateStartIndexForVariantRuleDataProvider,
    showVariantTooltip,
    addNewVariantRule,
    updateVariantRule,
    selectVariantRule,
    updateCurrentVariantRule,
    publishAddNewVariantRuleEvent,
    populateConsumerAppsDataInput,
    resetConsumerAppsData
};
app.factory( 'variantInfoConfigurationService', () => exports );
