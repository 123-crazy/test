// Copyright (c) 2020 Siemens

/**
 * Defines controller for '<wysiwyg-canvas-editor>' directive.
 * @module js/wys-canvas-editor.controller
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import Debug from 'Debug';
import $ from 'jquery';
import eventBus from 'js/eventBus';
import _ from 'lodash';
import 'js/appCtxService';
import 'js/viewModelService';
import 'js/wysiwyg-view-editorUtils.service';
import 'js/wysiwygLoadAndSaveService';
import 'js/wys-widget-wrapper.directive';
import 'js/wysiwyg-canvas.service';
import 'js/wysiwygXmlParserService';
import 'js/wysiwygUtilService';
import 'js/wysMockDataContributorService';

var trace = new Debug( 'wysCanvasEditorCtrl' );

/**
 * Defines awTree controller. Extends the {@link  NgControllers.wysViewEditorCtrl}.
 *
 * @member wysCanvasEditorCtrl
 * @memberof NgControllers.wysViewEditorCtrl
 */
app.controller( 'wysCanvasEditorCtrl', [
    '$scope', '$compile', '$element', 'appCtxService',
    'wysiwygLoadAndSaveService', 'viewModelService', '$q', 'wygCanvasSvc', 'wysiwygXmlParserService', 'wysiwygUtilService', 'wysMockDataContributorService',
    function( $scope, $compile, $element, appCtxSvc, wysiwygLoadAndSaveService, viewModelService, $q, wygCanvasSvc, wysiwygXmlParserService, wysiwygUtilService,
        wysMockDataContributorService ) {
        var ctrl = this;
        var childScope;
        var eventSub = [];
        var _wysiwygXmlParserService = wysiwygXmlParserService;

        const DROP_AREA_INDICATOR_FOR_LAYOUT = 'wys-canvas-dropAreaIndicatorLayout'; // class to highlight the drop area for layout elements
        const CONTAINER_AS_WIDGET = '.wys-canvas-layoutElementAsWidget';
        const WIDGET_SELECTION_CLASS = 'widget-selection';
        const WYS_LAYOUT_TEMPLATE_CLASS = '.wys-canvas-layoutTemplate';
        const WYS_NON_COMP_WIDGET_CLASS = '.widget,.noncompWidget';
        const WYS_CANVAS_CONTAINER = 'wys-canvas-container';

        var removeLayoutWidgetSelection = function() {
            var className = WIDGET_SELECTION_CLASS;
            $element.find( WYS_LAYOUT_TEMPLATE_CLASS ).removeClass( className );
            $element.find( WYS_NON_COMP_WIDGET_CLASS ).removeClass( className );
        };

        ctrl.registerWidgetId = function( event, data ) {
            $scope.$applyAsync( function() {
                updateCanvasDataWithSelectedElement( data.actualWidgetId );
                eventBus.publish( 'wysiwyg.widgetSelected' );
                $scope.$broadcast( 'deselectOtherWidgets', { wrapperId: data.wrapperId } );
                removeLayoutWidgetSelection();
            } );
        };

        ctrl.unregisterWidgetId = function() {
            $scope.$applyAsync( function() {
                $scope.canvasData.currentSelectedElementId = null;
                $scope.canvasData.currentSelectedElementType = null;
            } );
        };

        $scope.$on( 'registerWidgetId', function( event, data ) {
            ctrl.registerWidgetId( event, data );
        } );

        $scope.$on( 'unRegisterWidgetId', function() {
            ctrl.unregisterWidgetId();
        } );

        $scope.dragoverHandler = function( ev ) {
            ev.preventDefault();
            ev.stopPropagation();
        };

        $scope.dropHandler = function( ev ) {
            ev.preventDefault();
            ev.stopPropagation();
            wygCanvasSvc.processCanvasDrop( ev, $scope.canvasData );
        };

        var isWidgetDeletable = function( ev, element ) {
            var widgetElementTargets = [ 'BODY', 'DIV' ];
            return ev.which === 46 && element.length > 0 && widgetElementTargets.includes( ev.target.nodeName.toUpperCase() );
        };

        ctrl.deleteWidget = function( ev ) {
            // No need to even do a single line of processing, if delete button is not pressed
            if( ev && ev.which === 46 ) {
                var element = $( '#' + $scope.canvasData.currentSelectedElementId );

                if( isWidgetDeletable( ev, element ) ) {
                    var isDeleted = wygCanvasSvc.processDelete( $scope.canvasData );
                    if( isDeleted ) {
                        ctrl.unregisterWidgetId();
                    }
                }
            }
        };

        $scope.loadCanvas = function( viewXML, viewModel ) {
            // ViewModel could't be Null, atleast default viewmodel should be generated.
            if( viewModel ) {
                // Get View-XML(Plain View used by Editors)
                if( _.isString( viewModel ) ) {
                    viewModel = JSON.parse( viewModel );
                }
                // Update the Html-Model (i.e. View with id and CSS for Canvas)
                if( viewXML && viewXML.length > 0 ) {
                    var viewDocument = _wysiwygXmlParserService.parseViewXMLCnavas( viewXML );
                    var canvasModel = wygCanvasSvc.convertToCanvasModel( viewDocument );
                    $scope.canvasData.canvasModel = ctrl.generateAndAssignId( canvasModel );
                    // Load the canvas using htmlModel and viewmodel
                    viewXML = wygCanvasSvc.serializeToString( $scope.canvasData.canvasModel );
                }
                ctrl.regenerateCanvasView( viewXML, viewModel );
                ctrl.unregisterWidgetId();
                viewModel._viewModelId = wysiwygLoadAndSaveService.getCurrentPanelId();
                $scope.canvasData.viewModel = viewModel;
            }
        };
        var updateCanvasWrapper = function() {
            if( $scope.canvasData.currentSelectedElementId ) {
                var destinationNode = _wysiwygXmlParserService.getElementById( $scope.canvasData.canvasModel, $scope.canvasData.currentSelectedElementId );
                if( destinationNode && destinationNode.parentNode && destinationNode.parentNode.attributes && destinationNode.parentNode.attributes[ 'wrapped-widget-view' ] ) {
                    var canvasConfigurations = appCtxSvc.getCtx( 'wysiwyg.canvas.configurations' );
                    var nestedElemntObjs = canvasConfigurations.nestedViewElements;
                    var nestedElements = new Map();
                    nestedElemntObjs.forEach( function( element ) {
                        nestedElements.set( element.name, element.attr );
                    } );
                    destinationNode.parentNode.attributes[ 'wrapped-widget-view' ].nodeValue = destinationNode.attributes[ nestedElements.get( destinationNode.localName ) ].nodeValue;
                }
            }
        };

        $scope.refreshCanvas = function( canvasData ) {
            canvasData.viewModel._viewModelId = wysiwygLoadAndSaveService.getCurrentPanelId();
            $scope.canvasData = canvasData;
            updateCanvasWrapper();
            ctrl.regenerateCanvasView( wygCanvasSvc.serializeToString( canvasData.canvasModel ), canvasData.viewModel );
            eventBus.publish( 'wysiwyg.refreshNestedView' );
        };

        ctrl.getRandomInt = function() {
            var max = 10000;
            return Math.floor( Math.random() * Math.floor( max ) );
        };

        var updateCanvasDataWithSelectedElement = function( id ) {
            $scope.canvasData.currentSelectedElementId = id;
            if( $scope.canvasData.currentSelectedElementId ) {
                var selectedElement = $element.find( '#' + $scope.canvasData.currentSelectedElementId );

                if( $( selectedElement ).closest( 'wys-widget-wrapper' ).length === 0 ) {
                    $scope.canvasData.currentSelectedElementType = 'LayoutElement';
                } else {
                    $scope.canvasData.currentSelectedElementType = 'buildingBlockElement';
                }
            }
        };

        ctrl.registerSelectedElement = function( id ) {
            $scope.$applyAsync( function() {
                updateCanvasDataWithSelectedElement( id );
                eventBus.publish( 'wysiwyg.widgetSelected' );
            } );
        };

        var selectCanvasContainerElement = function( wrapperId ) {
            var currentTarget = $element.find( '#' + wrapperId );
            removeLayoutWidgetSelection();

            if( $scope.canvasData.currentSelectedElementId === wrapperId ) {
                ctrl.unregisterWidgetId( wrapperId );
            } else {
                $( currentTarget ).addClass( WIDGET_SELECTION_CLASS );
                ctrl.registerSelectedElement( wrapperId );
                $scope.$broadcast( 'deselectOtherWidgets', { wrapperId: wrapperId } );
            }
        };

        ctrl.showSelected = function( ev ) {
            ev.preventDefault();
            ev.stopPropagation();
            // Logic for clicking hat for nested view
            if( ev.target && ev.target.attributes[ 'wrapped-widget-view' ] ) {
                var pseudoElmntClick = document.querySelector( 'wys-widget-wrapper[wrapped-widget-view=' + ev.target.attributes[ 'wrapped-widget-view' ].nodeValue + ']' );
                if( pseudoElmntClick && ev.offsetX < pseudoElmntClick.offsetWidth ) {
                    wysiwygUtilService.updateUrlSubpanelId( ev.target.attributes[ 'wrapped-widget-view' ].nodeValue );
                    return true;
                }
            }
            //ends here
            var actualWidgetId = null;
            if( $( ev.currentTarget ).hasClass( 'widget' ) || $( ev.currentTarget ).hasClass( 'noncompWidget' ) ) {
                actualWidgetId = $( ev.currentTarget ).find( '#widgetPlaceHolder' ).find( ':first-child' ).attr( 'id' );
            } else {
                actualWidgetId = ev.currentTarget.id;
            }

            removeLayoutWidgetSelection();

            if( $scope.canvasData.currentSelectedElementId === actualWidgetId ) {
                ctrl.unregisterWidgetId( actualWidgetId );
            } else {
                $( ev.currentTarget ).addClass( WIDGET_SELECTION_CLASS );
                ctrl.registerSelectedElement( actualWidgetId );
                $scope.$broadcast( 'deselectOtherWidgets', { wrapperId: actualWidgetId } );
            }
        };

        ctrl.regenerateCanvasView = function( serializedHTML, viewModel ) {
            return viewModelService.populateViewModelPropertiesFromJson( viewModel ).then(
                function( declViewModel ) {
                    try {
                        var renderCurrentView = function() {
                            var container = $element.find( WYS_CANVAS_CONTAINER ).children().first();
                            if( container ) {
                                // Clear out current contents and destroy child scope
                                container.empty();
                                if( childScope ) {
                                    // Before destroy we need to copy the subPanelContext if any
                                    childScope.$destroy();
                                }
                                // Compile the new contents with a new child scope
                                childScope = $scope.$new();
                                childScope.isWysiwygMode = true;
                                var childElement = $compile( serializedHTML )( childScope );
                                container.append( childElement );
                                viewModelService.setupLifeCycle( childScope, declViewModel );
                            }
                        };
                        renderCurrentView();
                        _.defer( function() {
                            ctrl.assignEventHandlers();
                            eventBus.publish( declViewModel._internal.panelId + '.contentLoaded' );
                            if( wysiwygUtilService.getDroppedElementType() === 'buildingBlockElement' ) {
                                $scope.$broadcast( 'selectWidget', { wysId: wysiwygUtilService.getDroppedElementId() } );
                            } else {
                                var containerWysId = wysiwygUtilService.getDroppedElementId();
                                if( containerWysId !== $scope.canvasData.currentSelectedElementId ) {
                                    selectCanvasContainerElement( containerWysId );
                                } else {
                                    var currentTarget = $element.find( '#' + containerWysId );
                                    if( !$( currentTarget ).hasClass( WIDGET_SELECTION_CLASS ) ) {
                                        $( currentTarget ).addClass( WIDGET_SELECTION_CLASS );
                                    }
                                }
                            }
                        } );
                        return $q.resolve();
                    } catch ( e ) {
                        trace( e );
                        return $q.reject();
                    }
                } );
        };

        $scope.dragstartHandler = function( ev ) {
            ev.stopPropagation();
            var draggedEleWrapperId = ev.currentTarget.id;
            var data = {
                isReorder: true,
                draggedEleId: draggedEleWrapperId
            };
            ev.originalEvent.dataTransfer.setData( 'text', JSON.stringify( data ) );
        };

        $scope.dragEnterHandler = function( ev ) {
            ev.stopPropagation();
            $scope.target = ev.target.closest( CONTAINER_AS_WIDGET );

            if( !$scope.target.classList.contains( DROP_AREA_INDICATOR_FOR_LAYOUT ) ) {
                $scope.target.classList.add( DROP_AREA_INDICATOR_FOR_LAYOUT );
            }
        };

        $scope.dragleaveHandler = function( ev ) {
            ev.stopPropagation();
            if( $scope.target.classList.contains( DROP_AREA_INDICATOR_FOR_LAYOUT ) && $scope.target === ev.target.closest( CONTAINER_AS_WIDGET ) ) {
                $scope.target.classList.remove( DROP_AREA_INDICATOR_FOR_LAYOUT );
            }
        };

        ctrl.assignEventHandlers = function() {
            $element.find( WYS_LAYOUT_TEMPLATE_CLASS )
                .off( 'drop' )
                .off( 'dragover' )
                .off( 'dragenter' )
                .on( 'drop', $scope.dropHandler )
                .on( 'dragover', $scope.dragoverHandler )
                .on( 'dragenter', $scope.dragoverHandler )

                .off( 'click' )
                .on( 'click.wyswidget', ctrl.showSelected );

            $element.find( CONTAINER_AS_WIDGET )
                .off( 'dragover' )
                .attr( 'draggable', 'true' )
                .on( 'dragstart', $scope.dragstartHandler )
                .on( 'dragover', $scope.dragoverHandler )
                .off( 'dragenter' )
                .on( 'dragenter', $scope.dragEnterHandler )
                .off( 'dragleave' )
                .on( 'dragleave', $scope.dragleaveHandler );

            $element.find( WYS_NON_COMP_WIDGET_CLASS )
                .off( 'blur' )
                .on( 'blur.wyswidget', ctrl.updateAndRegenView );

            $( 'body' )
                .off( 'keydown' )
                .on( 'keydown.wyswidget', ctrl.deleteWidget );
        };

        ctrl.generateAndAssignId = function( viewDocument ) {
            _.forEach( viewDocument.childNodes, function traverseAndassign( node ) {
                if( node.nodeType === 1 || node.nodeType === 2 ) {
                    node.setAttribute( 'id', 'wys-' + ctrl.getRandomInt() );
                }
                if( node.childNodes && node.childNodes.length > 0 ) {
                    _.forEach( node.childNodes, traverseAndassign );
                }
            } );
            return viewDocument;
        };

        /**
         * This function returns the parent id of a structure
         * @param {*} viewDocument
         */
        ctrl.getId = function( viewDocument ) {
            var node = viewDocument.childNodes[ 0 ];
            if( node ) {
                return node.getAttribute( 'id' );
            }
            return null;
        };
        eventSub.push( eventBus.subscribe( 'wysiwyg.reloadWysiwygEditor', function() {
            var declViewModelId = wysiwygLoadAndSaveService.getCurrentPanelId();
            if( declViewModelId ) {
                var viewXML = wysiwygLoadAndSaveService.getViewData();
                wysiwygLoadAndSaveService.getViewModelData().then( function( viewJSON ) {
                    viewJSON = wysMockDataContributorService.contributeMockData( viewXML, viewJSON );
                    $scope.loadCanvas( viewXML, viewJSON );
                } );
            }
        } ) );

        eventSub.push( eventBus.subscribe( 'wysiwyg.resetWysiwygEditor', function() {
            var declViewModelId = wysiwygLoadAndSaveService.getCurrentPanelId();
            if( declViewModelId ) {
                var viewData;
                var viewModelData;

                AwPromiseService.instance.all( [
                    wysiwygLoadAndSaveService.getView().then( function( view ) {
                        viewData = view;
                        return true; // ensure completion before completing promise
                    } ),
                    wysiwygLoadAndSaveService.getViewModelData().then( function( viewModel ) {
                        viewModelData = viewModel;
                        return true; // ensure completion before completing promise
                    } )
                ] ).then( function() {
                    viewModelData = wysMockDataContributorService.contributeMockData( viewData, viewModelData );
                    appCtxSvc.updatePartialCtx( 'wysiwygCurrentPanel.isDirty', false );
                    wysiwygUtilService.clearDroppedElementIdAndType();
                    wysiwygLoadAndSaveService.updateViewAndViewModel( viewData, viewModelData );
                    $scope.loadCanvas( viewData, viewModelData );
                } );
            }
        } ) );

        eventSub.push( eventBus.subscribe( 'refreshWysiwygCanvas', function( canvasData ) {
            var declViewModelId = wysiwygLoadAndSaveService.getCurrentPanelId();
            if( declViewModelId ) {
                $scope.refreshCanvas( canvasData );
            }
        } ) );

        // aw.canvas.regenarate is an internal event , not to be used for outside canvas.
        eventSub.push( eventBus.subscribe( 'aw.canvas.regenerate', function() {
            var viewXML = wygCanvasSvc.convertToViewXML( $scope.canvasData.canvasModel );
            wysiwygLoadAndSaveService.updateViewAndViewModel( viewXML, $scope.canvasData.viewModel );

            wysiwygUtilService.setDroppedElementId( $scope.canvasData.currentSelectedElementId );
            wysiwygUtilService.setDroppedElementType( $scope.canvasData.currentSelectedElementType );
            $scope.refreshCanvas( $scope.canvasData );
        } ) );

        $scope.$on( '$destroy', function handleDestroy() {
            $( 'body' ).off( 'keydown' );
            $element.find( WYS_NON_COMP_WIDGET_CLASS ).off( 'blur' );
            $element.find( WYS_LAYOUT_TEMPLATE_CLASS )
                .off( 'dragover' )
                .off( 'drop' )
                .off( 'click' );

            if( childScope ) {
                childScope.$destroy();
            }
            eventSub.forEach( function( subscription ) {
                eventBus.unsubscribe( subscription );
            } );
        } );
    }
] );
