// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * @module js/aw-xrt.controller
 */
import * as app from 'app';
import ngModule from 'angular';
import $ from 'jquery';
import _ from 'lodash';
import assert from 'assert';
import eventBus from 'js/eventBus';
import ngUtils from 'js/ngUtils';
import declUtils from 'js/declUtils';
import logger from 'js/logger';
import 'soa/kernel/soaService';
import 'soa/kernel/clientDataModel';
import 'js/viewModelService';
import 'js/panelContentService';
import 'js/editHandlerService';
import 'js/showObjectCommandHandler';
import 'js/localeService';
import 'soa/kernel/clientMetaModel';
import 'js/xrtParser.service';
import 'js/editHandlerFactory';
import 'js/dataSourceService';
import 'js/command.service';
import 'js/appCtxService';

/**
 * Controller referenced from the 'div' <aw-xrt>
 *
 * @memberof NgController
 * @member awXrtController
 */
app.controller( 'awXrtController', [
    '$scope',
    '$element',
    '$compile',
    'soa_kernel_soaService',
    'viewModelService',
    'panelContentService',
    'editHandlerService',
    'editHandlerFactory',
    'showObjectCommandHandler',
    'soa_kernel_clientDataModel',
    'soa_kernel_clientMetaModel',
    'localeService',
    'dataSourceService',
    'xrtParserService',
    function( $scope, $element, $compile, soaSvc, viewModelSvc, panelContentSvc, editService, editHandlerFactory,
        showObjectCommandHandler, clientDataModel, clientMetaModel, localeSvc, dataSourceService, xrtParserSvc ) {
        var self = this;

        var DEFAULT_TAB_KEY = 'defaultTabKey';
        var editHandlerContextConstant = {
            INFO: 'INFO_PANEL_CONTEXT',
            SUMMARY: 'NONE'
        };

        var currentPageKey = $scope.targetPage;
        var insertionPointScope = null;

        var _eventBusSubDefs = [];

        var propertiesToRemove = [];
        var contentLoadedSubs = [];

        $scope.dynamicCommandIds = [ 'Awp0StartEdit', 'Awp0StartEditGroup', 'Awp0SaveEdits', 'Awp0CancelEdits' ];
        $scope.dynamicCommands = [];

        if( !$scope.type ) {
            logger.error( 'Failed to render <aw-xrt>, $scope.type is null.' );
            return;
        }

        /**
         * Decode any HTML panel within the XRT
         *
         * Should be safe as the contents of the aw-html-panel are all encoded avoiding need
         * for a full XML parser
         *
         * @param {String} text the XML text to decode
         * @return {String} decoded XML String
         */
        var _decodeHTMLPanel = function( text ) {
            if( !text ) {
                return null;
            }
            //extract all html panel and their contents
            const htmlPanels = [ ...text.matchAll( /<aw-html-panel>[\s\S]*?<\/aw-html-panel>/g ) ];
            return htmlPanels.reduce( ( finalText, nextMatch ) => {
                //replace with the decoded version
                const decodedMatch = nextMatch[ 0 ]
                    .replace( /&amp;/g, '&' )
                    .replace( /&quot;/g, '"' )
                    .replace( /&lt;/g, '<' )
                    .replace( /&gt;/g, '>' );
                return finalText.replace( nextMatch[ 0 ], decodedMatch );
            }, text );
        };

        /**
         * Get the xml node for provided pageKey.
         *
         * @param {String} xml
         * @return node
         */
        var _getPage = function( xml ) {
            assert( xml !== '' || $.type( xml ) === 'string', 'invalid xml' );
            var node = $( xml ).find( 'aw-panel-body[visible-when]' );

            if( node.length === 0 ) {
                node = $( xml )[ $( xml ).length - 1 ];
            }

            return node;
        };

        /**
         * Get insertion point
         *
         * @param {DOMNode} element
         * @return node
         */
        var _getInsertionPoint = function( element ) {
            assert( element !== null && element !== undefined, 'invalid element' );
            var jQElement = ngModule.element( element );
            var insertionPoint = jQElement.find( '.aw-jswidget-summaryPage.aw-layout-flexColumn' );
            insertionPoint = ngModule.element( insertionPoint );
            return insertionPoint;
        };

        /**
         * Get insertion point
         *
         * @param {DOMNode} element
         * @return node
         */
        var _getOldInsertionPoint = function( element ) {
            assert( element !== null && element !== undefined, 'invalid element' );
            var jQElement = ngModule.element( element );
            var insertionPoint = jQElement.find( '.aw-jswidget-tabPage.aw-layout-flexColumn' );
            insertionPoint = ngModule.element( insertionPoint );
            return insertionPoint;
        };

        /**
         * Set data attribute for <aw-gwt-presenter> element to load HTML panel for the XRT tab
         *
         * @param {DOMNode} xrtViewElement represent the declarative view for XRT
         * @param {Object} declViewModel the declarative view model of the XRT page
         * @param {String} pageId the XRT tab page ID
         */
        var _setGWTPanelData = function( xrtViewElement, declViewModel, pageId ) {
            var gwtPresenterElems = $( xrtViewElement ).find( 'aw-gwt-presenter' );
            if( gwtPresenterElems.length > 0 ) {
                _.forEach( gwtPresenterElems, function( presenterElem ) {
                    var htmlPanelElem = $( presenterElem );
                    htmlPanelElem.attr( 'data', 'data.xrtData' );

                    declViewModel.xrtData = {};

                    var modelObject = null;
                    if( $scope.vmo ) {
                        modelObject = clientDataModel.getObject( $scope.vmo.uid );
                    } else if( $scope.objectType ) {
                        modelObject = clientMetaModel.getType( $scope.objectType );
                    } else {
                        return;
                    }

                    var EDIT_CONTEXT = null;
                    if( $scope.type === 'SUMMARY' ) {
                        EDIT_CONTEXT = 'GWT_SUMMARY_PANEL_CONTEXT';
                    } else if( $scope.type === 'INFO' ) {
                        EDIT_CONTEXT = 'GWT_INFO_PANEL_CONTEXT';
                    }
                } );
            }
        };

        /**
         * Function to load a tab content upon navigation
         *
         * @param {String} selectedTabKey - The selected tab's key
         */
        var _editSupportFun = function( selectedTabKey ) {
            xrtParserSvc.getDeclStyleSheet( $scope.type, selectedTabKey, $scope.vmo, $scope.objectType ).then(
                function( response ) {
                    currentPageKey = selectedTabKey;
                    var declViewModelTarget = viewModelSvc.getViewModel( $scope, true );
                    if( declViewModelTarget ) {
                        declViewModelTarget.removeSubPanel( currentPageKey );
                        declViewModelTarget.addSubPanel( currentPageKey );

                        _.forEach( propertiesToRemove, function( prop ) {
                            delete declViewModelTarget[ prop ];
                        } );
                    }

                    if( insertionPointScope ) {
                        insertionPointScope.$destroy();
                    }

                    var viewModelJson = JSON.parse( response.declarativeUIDefs[ 0 ].viewModel );

                    propertiesToRemove = _.clone( viewModelJson.data.propertyNamesRetrieved );

                    var respPromise = xrtParserSvc.handleGetDeclStyleSheetResponse( response, $scope.targetPage,
                        $scope.vmo, $scope.type, $scope, true );

                    respPromise.then( function( declViewModel ) {
                        // Create a new Edit Handler and register to edit service.
                        if( editHandlerContextConstant[ $scope.type ] ) {
                            var editHandler = editHandlerFactory.createEditHandler( dataSourceService
                                .createNewDataSource( {
                                    declViewModel: declViewModel
                                } ) );
                            if( editHandler ) {
                                editService.setEditHandler( editHandler, editHandlerContextConstant[ $scope.type ] );
                                editService.setActiveEditHandlerContext( editHandlerContextConstant[ $scope.type ] );
                            }
                        }

                        var insertionPoint = _getOldInsertionPoint( $element );

                        // applicable for new viewModel approach
                        if( declViewModel._pages ) {
                            insertionPoint = _getInsertionPoint( $element );
                        }

                        insertionPointScope = ngModule.element( insertionPoint ).scope().$new();
                        insertionPointScope.conditions = declViewModel.getConditionStates();

                        var htmlString = _getPage( _decodeHTMLPanel( response.declarativeUIDefs[ 0 ].view ) );

                        _setGWTPanelData( htmlString, declViewModel, currentPageKey );

                        var xrtViewElement = ngModule.element( htmlString );

                        $compile( xrtViewElement )( insertionPointScope );

                        insertionPoint.empty();
                        insertionPoint.append( xrtViewElement );

                        $scope
                            .$applyAsync( function() {
                                var dataCtxNode = ngModule.element( xrtViewElement ).scope();

                                viewModelSvc.setupLifeCycle( dataCtxNode, declViewModel );

                                //notify the XRT content has been loaded
                                eventBus.publish( 'awXRT.contentLoaded', dataCtxNode );

                                //register edit handler to edit service for Info Panel
                                var editHandler = editService
                                    .getEditHandler( editHandlerContextConstant[ $scope.type ] );
                                if( editHandler ) {
                                    editHandler.cancelEdits();
                                }
                            } );
                    } );
                } );
        };

        /**
         *
         */
        var _addSubscriptions = function() {
            $scope.$watch( 'targetPage', function _watchXrtTargetPage( newValue, oldValue ) {
                if( newValue !== '' && newValue !== oldValue && currentPageKey !== newValue ) {
                    var editHandler = editService.getEditHandler( editHandlerContextConstant[ $scope.type ] );
                    if( editHandler ) {
                        editHandler.leaveConfirmation().then( function() {
                            editService.removeEditHandler( editHandlerContextConstant[ $scope.type ] );
                            _editSupportFun( newValue );
                        } );
                    } else {
                        editService.removeEditHandler( editHandlerContextConstant[ $scope.type ] );
                        _editSupportFun( newValue );
                    }
                }
            } );

            $scope.$on( 'awTab.selected', function( event, data ) {
                // skip awTab.selected event handling if there isn't any tab models
                var selectedTabKey = data.selectedTab.tabKey;
                //notify that first page is loaded
                if( currentPageKey === selectedTabKey && declUtils.isNil( data.selectedTab.panelId ) ) {
                    eventBus.publish( 'awXRT.contentLoaded', $scope );

                    var insertionPoint = $element.find( 'form[name=awPanelBody]' );
                    // Keeping this scope to clean it up before next loading  happens
                    insertionPointScope = ngModule.element( insertionPoint ).scope();
                }

                var tabModels = null;
                if( $scope.data.tabModels && $scope.data.tabModels.dbValues ) {
                    tabModels = $scope.data.tabModels.dbValues;
                }

                if( !tabModels ) {
                    tabModels = $scope.data._pages;
                }

                if( !tabModels || currentPageKey === selectedTabKey ||
                    !declUtils.isNil( data.selectedTab.panelId ) || declUtils.isNil( $scope.data ) ||
                    declUtils.isNil( tabModels ) ) {
                    return;
                }

                var editHandler = editService.getEditHandler( editHandlerContextConstant[ $scope.type ] );
                if( editHandler ) {
                    editHandler.leaveConfirmation().then( function() {
                        editService.removeEditHandler( editHandlerContextConstant[ $scope.type ] );
                        _editSupportFun( selectedTabKey );
                    } );
                }
            } );

            _eventBusSubDefs.push( eventBus.subscribe( 'aw.showObject', function( context ) {
                showObjectCommandHandler.execute( context );
            } ) );

            if( $scope.type === 'INFO' ) {
                _eventBusSubDefs.push( eventBus.subscribe( 'objInfo.startEdit', function() {
                    var editHandler = editService.getEditHandler( editHandlerContextConstant[ $scope.type ] );
                    if( editHandler ) {
                        editHandler.startEdit();
                    }
                } ) );

                _eventBusSubDefs.push( eventBus.subscribe( 'objInfo.saveEdit', function() {
                    var editHandler = editService.getEditHandler( editHandlerContextConstant[ $scope.type ] );
                    if( editHandler ) {
                        editHandler.saveEdits();
                    }
                } ) );
            }
        }; // _addSubscriptions

        /**
         * Get target page
         */
        self.getTargetPage = function( targetPage ) {
            return targetPage ? targetPage : DEFAULT_TAB_KEY;
        };

        /*
         * Handle the object change response
         */
        self.handleVmoChangeResponse = function( view, declViewModel, jsonData, pageKey ) {
            // reset currentPageKey for the first time
            if( pageKey === DEFAULT_TAB_KEY ) {
                if( declViewModel._pages ) {
                    currentPageKey = declViewModel._pages[ 0 ].titleKey;
                } else if( declViewModel.tabModels && declViewModel.tabModels.dbValues.length > 0 ) {
                    currentPageKey = declViewModel.tabModels.dbValues[ 0 ].tabKey;
                }
            }

            viewModelSvc.bindConditionStates( declViewModel, $scope );

            $scope.conditions = declViewModel.getConditionStates();
            var htmlString = _decodeHTMLPanel( view );
            if( $scope.type === 'SUMMARY' ) {
                htmlString = _getPage( _decodeHTMLPanel( view ) );
            }
            var xrtViewElement = ngModule.element( htmlString );

            // Clear content
            _getInsertionPoint( $element ).empty();

            //Collect view model properties in custom panels, to support Revise and SaveAs
            declViewModel.customPanelInfo = {};
            var awIncludeElements = $( xrtViewElement ).find( 'aw-include' );
            _.forEach( awIncludeElements, function( widget ) {
                var panelName = $( widget ).attr( 'name' );
                var subs = eventBus.subscribe( panelName + '.contentLoaded', function( eventData ) {
                    declViewModel.customPanelInfo[ panelName ] = viewModelSvc.getViewModel( eventData.scope, false );
                } );
                contentLoadedSubs.push( subs );
            } );
            // Collect all properties from "prop" attribute in <aw-widget>
            var xrtViewElementProperties = [];
            var widgets = $( xrtViewElement ).find( 'aw-widget' );
            _.forEach( widgets, function( widget ) {
                var propName = $( widget ).attr( 'prop' );
                if( propName ) {
                    if( propName.indexOf( '.' ) > -1 ) {
                        propName = propName.slice( 5 );
                    } else if( propName.indexOf( '[\'' ) > -1 ) {
                        propName = propName.replace( 'data[\'', '' );
                        propName = propName.replace( '\']', '' );
                    }

                    xrtViewElementProperties.push( propName );
                }
            } );

            if( $scope.type === 'CREATE' ) {
                declViewModel.objCreateInfo = {
                    createType: $scope.objectType,
                    propNamesForCreate: xrtViewElementProperties
                };
            }

            // Reconcile the properties with 'patterns' into the view model.
            // TODO: remove this when SOA response has correct pattern mapping
            _.forEach( xrtViewElementProperties, function( xrtViewElementProp ) {
                var propNameToMatch = xrtViewElementProp;
                if( xrtViewElementProp.indexOf( '__' ) > 0 ) { // compound prop
                    var temp = xrtViewElementProp.split( '__' );
                    propNameToMatch = temp[ 1 ];
                }
                if( jsonData && jsonData.data[ propNameToMatch ] ) {
                    var rhs = jsonData.data[ propNameToMatch ];
                    if( declViewModel[ xrtViewElementProp ] ) {
                        Object.keys( rhs ).forEach( function( key ) {
                            declViewModel[ xrtViewElementProp ][ key ] = rhs[ key ];
                        } );
                    }
                }
            } );

            _setGWTPanelData( xrtViewElement, declViewModel, currentPageKey );
            _getInsertionPoint( $element ).append( xrtViewElement );
            ngUtils.include( $element, xrtViewElement );

            var dataCtxNode = ngModule.element( xrtViewElement ).scope();
            viewModelSvc.setupLifeCycle( dataCtxNode, declViewModel );
            if( editHandlerContextConstant[ $scope.type ] ) {
                var editHandler = editHandlerFactory.createEditHandler( dataSourceService.createNewDataSource( {
                    declViewModel: declViewModel
                } ) );
                if( editHandler ) {
                    editService.setEditHandler( editHandler, editHandlerContextConstant[ $scope.type ] );
                    editHandler.cancelEdits( null, true );
                    if( $scope.type !== 'INFO' ) {
                        editService.setActiveEditHandlerContext( editHandlerContextConstant[ $scope.type ] );
                    }
                }
            }

            //notify the XRT content has been loaded when no tab models in XRT view model
            //if there are tab models in XRT view model response, 'awXRT.contentLoaded' will be fired when handling 'awTab.selected' event
            if( !declViewModel._pages || declViewModel._pages.length === 0 ) {
                eventBus.publish( 'awXRT.contentLoaded', dataCtxNode );
            }
        };

        /**
         * Populate jsonData structure to pass into handleVmoChangeResponse method
         *
         * @method populateJsonData
         * @memberOf NgControllers.ShowObjectLocationCtrl
         *
         * @param {Object} json from getDeclarativeStylesheets response
         * @return jsonData
         */
        self.populateJsonData = function( jsonViewModel ) {
            var jsonData = {};

            if( jsonViewModel ) {
                jsonData = JSON.parse( jsonViewModel );

                jsonData._viewModelId = $scope.targetPage;
                jsonData.skipClone = true;

                //The operation name is required for view model processing
                var operationName = $scope.type;

                if( $scope.type === 'INFO' || $scope.type === 'SUMMARY' ) {
                    operationName = 'Edit';
                }

                jsonData.data.operationName = operationName;

                if( $scope.vmo ) {
                    jsonData.data.owningObjUid = $scope.vmo.uid;
                }
            }

            return jsonData;
        };

        /**
         * Select that tab that is meant to be selected according to $state parameters.
         *
         * @method selectTab
         * @memberOf NgControllers.ShowObjectLocationCtrl
         */
        self.selectTab = function( tabToSelect ) {
            //Ensure the correct tab appears as selected
            if( !tabToSelect.selectedTab ) {
                //                    $scope.$broadcast( 'NgTabSelectionUpdate', tabToSelect );
            }

            //Check edit handler
            editService.leaveConfirmation().then( function() {
                //And update the view
                $scope.activeTab = tabToSelect;
                $scope.targetPage = $scope.activeTab.tabKey;
            } );
        };

        /**
         *
         */
        self.clearXrtContent = function( targetPage ) {
            // Clear the old content
            _getInsertionPoint( $element ).empty();

            // destroy the view model
            if( $scope.data ) {
                $scope.data.removeSubPanel( targetPage );
            }
        };

        /**
         * Initialize
         */
        self.init = function() {
            if( $scope.type === 'INFO' ) {
                _getInsertionPoint( $element ).addClass( 'aw-xrt-objectInfo' );
            }

            if( !$scope.targetPage ) {
                $scope.targetPage = '';
            }

            // Set 'Loading...' string
            if( $scope.type === 'SAVEAS' || $scope.type === 'REVISE' ) {
                localeSvc.getTextPromise().then(
                    function( localTextBundle ) {
                        var loadingHtml = '<div class="aw-create-loadingLabel">' + localTextBundle.LOADING_TEXT +
                            '</div>';
                        var loadingElement = ngModule.element( loadingHtml );
                        _getInsertionPoint( $element ).append( loadingElement );
                        ngUtils.include( $element, loadingElement );
                    } );
            }

            if( !$scope.viewModel ) {
                self.updateSummary( $scope.type, $scope.targetPage, $scope.vmo, $scope.objectType );

                //Register the listeners.
                if( !$scope.hasOwnProperty( 'objectType' ) ) {
                    handleModelObjectRelatedDataModifiedListener(); //ModelObjectRelatedDataModifiedEvent
                }
            }

            _addSubscriptions();
        };

        /**
         * Trigger when view model changes
         */
        self.onViewModelChange = function() {
            self.handleVmoChangeResponse( $scope.viewModel.view, $scope.viewModel.viewModel, null, self
                .getTargetPage( $scope.targetPage ) );

            var insertionPoint = null;
            if( $scope.type === 'SUMMARY' ) {
                insertionPoint = _getInsertionPoint( $element ).find( 'aw-walker-view' );
            } else {
                insertionPoint = _getInsertionPoint( $element ).find( 'aw-panel-body[visible-when]' );
            }

            insertionPointScope = ngModule.element( insertionPoint ).scope();
        };

        /**
         * Update summary by triggering getDeclarativeStyleSheets
         */
        self.updateSummary = function( type, targetPage, vmo, objectType ) {
            // Refresh panel content
            xrtParserSvc.getDeclStyleSheet( type, targetPage, vmo, objectType ).then(
                function( response ) {
                    var respPromise = xrtParserSvc.handleGetDeclStyleSheetResponse( response, targetPage, vmo,
                        type, $scope );

                    respPromise.then( function( declViewModel ) {
                        if( $scope.includeTabs ) {
                            var visiblePages = xrtParserSvc.getDeclVisiblePages( declViewModel );
                            //Build tabs for any sublocation that should be visible
                            xrtParserSvc.buildTabs( null, visiblePages ).then( function( result ) {
                                $scope.pages = result;

                                //Find and select the processed page.
                                $scope.pages.forEach( function( page ) {
                                    if( page && page.selectedTab ) {
                                        self.selectTab( $scope.pages[ page.pageId ] );
                                        return;
                                    }
                                } );
                            } );
                        }

                        var jsonData = self.populateJsonData( response.declarativeUIDefs[ 0 ].viewModel );
                        self.handleVmoChangeResponse( response.declarativeUIDefs[ 0 ].view, declViewModel, jsonData,
                            self.getTargetPage( targetPage ) );
                        if( insertionPointScope ) {
                            insertionPointScope.$destroy();
                        }
                    } );
                } );
        };

        /**
         * If the object currently loaded is modified refresh the location if necessary
         *
         * @private
         * @method handleModelObjectRelatedDataModifiedListener
         * @memberOf NgControllers.ShowObjectLocationCtrl
         */
        var handleModelObjectRelatedDataModifiedListener = function() {
            //Add listener
            _eventBusSubDefs.push( eventBus.subscribe( 'cdm.relatedModified', function( data ) {
                data.relatedModified.forEach( function( mo ) {
                    if( $scope.vmo && mo.uid === $scope.vmo.uid ) {
                        $scope.$evalAsync( function() {
                            if( data.refreshLocationFlag ) {
                                var targetPage;
                                if( $scope.type === 'INFO' && $scope.targetPage === '' ) {
                                    targetPage = $scope.targetPage;
                                } else {
                                    targetPage = self.getTargetPage( $scope.targetPage );
                                }
                                self.updateSummary( $scope.type, targetPage, $scope.vmo, $scope.objectType );
                            }
                        } );
                    }
                } );

                if( !data.refreshLocationFlag ) {
                    _editSupportFun( currentPageKey );
                }
            } ) );
        };

        /**
         * Initialize controller
         */
        self.init();

        /**
         * Callback from the tab widget. Activates the tab with the given name. Runs the leave confirmation of any
         * active edits before switching tabs.
         *
         * @param idx {Number} - Index of the tab to select. Changes when the tab widget rotates.
         * @param tabTitle {String} - Title of the tab to select.
         *
         * @method activateTab
         * @memberOf NgControllers.ShowObjectLocationCtrl
         */
        $scope.api = function( idx, tabTitle ) {
            //Determine which tab to select based on the name
            var tabToSelect = $scope.pages.filter( function( tab ) {
                return tab.name === tabTitle;
            } )[ 0 ];

            if( !tabToSelect ) {
                logger.error( 'Tab with the given title ' + tabTitle + ' not found.' );
            } else {
                self.selectTab( tabToSelect );
            }
        };

        if( $scope.type === 'SUMMARY' ) {
            $scope.$on( 'awProperty.addObject', function( event, context ) {
                event.stopPropagation();
                // Remove the destPanelId so that any command panel (who maybe listening) should not react.
                context.destPanelId = null;
                eventBus.publish( 'awPanel.navigate', context );
            } );
        }

        $scope.$on( '$destroy', function handleDestroy() {
            editService.removeEditHandler( editHandlerContextConstant[ $scope.type ] );

            self.clearXrtContent( $scope.targetPage );

            _.forEach( _eventBusSubDefs, function( subDef ) {
                eventBus.unsubscribe( subDef );
            } );
            _.forEach( contentLoadedSubs, function( subs ) {
                eventBus.unsubscribe( subs );
            } );
            contentLoadedSubs = [];
        } );
    }
] );
