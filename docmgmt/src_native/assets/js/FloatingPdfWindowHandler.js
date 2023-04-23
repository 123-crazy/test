//@<COPYRIGHT>@
//==================================================
//Copyright 2020.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/*global
 define
 */

/**
 *
 *
 * @module js/FloatingPdfWindowHandler
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import AwRootScopeService from 'js/awRootScopeService';
import AwCompileService from 'js/awCompileService';
import panelContentService from 'js/panelContentService';
import panelViewModelService from 'js/viewModelService';
import soaService from 'soa/kernel/soaService';
import messagingService from 'js/messagingService';
import dmSvc from 'soa/dataManagementService';
import ngModule from 'angular';
import _ from 'lodash';
import $ from 'jquery';
import eventBus from 'js/eventBus';

import 'js/aw-float-pdf-popup.directive';

var exports = {};

var _relString = '';
var _dataset = null;
var _sourceDataset = null;
var _itemRev = null;

/**
 * Load and initialize the Declarative View Model for the floating window.
 * to the HTML and start the pop-up.
 *
 * @param {String} popupDeclViewModelId - The Declarative View Model id to load.
 *
 * @returns {Promise} A promise that calls {@link deferred~resolve} if the declarative
 *     view model is loaded successfully, {@link deferred~reject} otherwise.
 */
function loadDeclarativeViewModel( popupDeclViewModelId ) {
    var deferred = AwPromiseService.instance.defer();

    panelContentService.getPanelContent( popupDeclViewModelId )
        .then( function( viewAndViewModelResponse ) {
            panelViewModelService.populateViewModelPropertiesFromJson( viewAndViewModelResponse.viewModel )
                .then( function( declarativeViewModel ) {
                    // Bond this scope to the popup's declarative view model.
                    var scope = AwRootScopeService.instance.$new();
                    var $element;
                    panelViewModelService.setupLifeCycle( scope, declarativeViewModel );

                    var showPopup = function() {
                        // Unregister this event callback.
                        if( subDefOpenPopup ) {
                            eventBus.unsubscribe( subDefOpenPopup );
                            subDefOpenPopup = null;
                        }

                        // Get the HTML content and attach it to the document.
                        var body = $( 'body' );
                        $element = $( viewAndViewModelResponse.view );
                        $element.appendTo( body );

                        // Retrieve the previous window size.
                        if( AwRootScopeService.instance && AwRootScopeService.instance.FloatViewerSize &&
                            AwRootScopeService.instance.FloatViewerSize.width && AwRootScopeService.instance.FloatViewerSize.width > 0 &&
                            AwRootScopeService.instance.FloatViewerSize.height && AwRootScopeService.instance.FloatViewerSize.height > 0 ) {
                            scope.windowHeight = AwRootScopeService.instance.FloatViewerSize.height;
                            scope.windowWidth = AwRootScopeService.instance.FloatViewerSize.width;
                        }

                        // Save the scope's data
                        if( AwRootScopeService.instance ) {
                            AwRootScopeService.instance.data = scope.data.viewerData;
                        }

                        // Compile the element with this scope.
                        AwCompileService.instance( $element )( scope );
                    };

                    var addDataset = function() {
                        // Parse _relString into relation name and optional property
                        var relName = 'TC_Attaches';
                        var optVal = '';

                        var titleSplit = _relString.split( ':' );
                        if( titleSplit.length === 2 ) {
                            var relNameAndOptValue = titleSplit[ 1 ].split( ';' );
                            if( relNameAndOptValue.length > 0 ) {
                                relName = relNameAndOptValue[ 0 ].trim();  // Trim trailing white space for Relation name
                            }
                            if( relNameAndOptValue.length > 1 ) {
                                optVal = relNameAndOptValue[ 1 ].trim();   // Trim trailing white space for Optional fnd0PageType property
                            }
                        }

                        // Create relationship between ItemRev and new dataset
                        var inputData = {
                            input: [ {
                                primaryObject: _itemRev,
                                secondaryObject: _dataset,
                                relationType: relName
                            } ]
                        };

                        var promise = soaService.post( 'Core-2006-03-DataManagement', 'createRelations', inputData );
                        promise.then( function( response ) {
                           if( response !== null ) {
                                if( relName === 'Fnd0DocPageTypeRel' && optVal !== '' ) {
                                    if( response.output !== null && response.output.length === 1 &&
                                        response.output[ 0 ].relation !== null ) {
                                        // Add property
                                        var input = {
                                            object: response.output[ 0 ].relation,
                                            vecNameVal: [ {
                                                name: 'fnd0PageType',
                                                values: [ optVal ]
                                            } ]
                                        };
                                        dmSvc.setProperties( [ input ] ); // Set property fnd0PageType = < optVal >
                                    }
                                }
                            }
                        },
                        function( error ) {
                            messagingService.showError( error.message );
                        } );

                        destroyPopup();
                    };

                    var closePopup = function() {
                        if( _dataset !== null ) {
                            // Delete TC_Derived and dataset
                            var infos = [];
                            var relInfo = {
                                relationTypeName: 'TC_Derived'
                            };

                            infos.push( relInfo );

                            var secondaryObjs = [];
                            secondaryObjs.push( _dataset );

                            var preferenceInfo = {
                                expItemRev: false,
                                returnRelations: true,
                                info: infos
                            };

                            var inputData = {
                                secondaryObjects: secondaryObjs,
                                pref: preferenceInfo
                            };

                            var secObj = _dataset;

                            var relInputArray = [];
                            var rel = {
                                relationType: 'TC_Derived',
                                //"primaryObject": dataset,
                                primaryObject: _sourceDataset,
                                secondaryObject: secObj
                            };
                            relInputArray.push( rel );
                            var delRelInput = {
                                input: relInputArray
                            };

                            soaService.post( 'Core-2006-03-DataManagement', 'deleteRelations', delRelInput ).then( function( result ) {
                                soaService.post( 'Core-2006-03-DataManagement', 'deleteObjects', { objects: [ secObj ] } );
                            } );
                        }

                        destroyPopup();
                    };

                    var destroyPopup = function() {
                        _relString = null;
                        _dataset = null;
                        _itemRev = null;
                        _sourceDataset = null;

                        // Unregister this event callback.
                        if( subDefClosePopup ) {
                            eventBus.unsubscribe( subDefClosePopup );
                            subDefClosePopup = null;
                        }

                        if( $element ) {
                            // Get the container element.
                            var container = ngModule.element( $element[ 0 ].querySelector( '.aw-popup-contentContainer' ) );

                            if( container ) {
                                var height = container.height();
                                var width = container.width();

                                // Save the window size
                                if( AwRootScopeService.instance ) {
                                    AwRootScopeService.instance.FloatViewerSize = {
                                        height: height,
                                        width: width
                                    };
                                }
                            }

                            $element.remove();
                        }

                        scope.$destroy();

                        scope.$apply();
                    };

                    // Event to open the popup.
                    var subDefOpenPopup = eventBus.subscribe( 'awFloatPdfPopup.openPopupWindow', showPopup );

                    // Event to close the popup.
                    var subDefClosePopup = eventBus.subscribe( 'awFloatPdfPopup.closePopupWindow', closePopup );

                    // Event to relate the PDF to the Item Rev
                    var subDefAddDataset = eventBus.subscribe( 'awFloatPdfPopup.addDatasetToRev', addDataset );

                    // Unsubscribe all of the event listeners.
                    scope.$on( '$destroy', function() {
                        if( subDefOpenPopup ) {
                            eventBus.unsubscribe( subDefOpenPopup );
                            subDefOpenPopup = null;
                        }

                        if( subDefClosePopup ) {
                            eventBus.unsubscribe( subDefClosePopup );
                            subDefClosePopup = null;
                        }

                        if( subDefAddDataset ) {
                            eventBus.unsubscribe( subDefAddDataset );
                            subDefAddDataset = null;
                        }
                    } );

                    // Resolve.
                    deferred.resolve();
                }, function onError( errMsg ) {
                    deferred.reject( errMsg );
                } );
        }, function onError( errMsg ) {
            deferred.reject( errMsg );
        } );

    return deferred.promise;
}

export let openPopup = function( targetObject, sourceDataset, dataset, relString ) {
    // Save the dataset and relationship string for later
    _relString = relString;
    _dataset = dataset;
    _itemRev = targetObject;
    _sourceDataset = sourceDataset;

    // Create then wait for the popup window.
    loadDeclarativeViewModel( 'FloatingPdfWindowPopup' ).then( function() {
        var data = { obj: dataset, dataset: dataset };
        eventBus.publish( 'awFloatPdfPopup.getViewerData', data );
    } );
};

/**
 * FloatingPdfWindowHandler factory
 */

// Angular JS.

// DeclViewModel loaders.

export default exports = {
    openPopup
};
app.factory( 'FloatingPdfWindowHandler', () => exports );
