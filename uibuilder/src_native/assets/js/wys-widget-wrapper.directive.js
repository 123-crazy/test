// Copyright (c) 2020 Siemens

/**
 * Directive to display tree of nodes
 * @module js/wys-widget-wrapper.directive
 */
import app from 'app';
import 'js/wysiwyg-view-editorUtils.service';
import 'js/wysiwyg-canvas.service';

/**
 * Directive to display tree of nodes
 *
 * @example <wys-widget-wrapper></wys-widget-wrapper>
 *
 * @member wysWidgetWrapper
 * @memberof NgElementDirectives
 */
app.directive( 'wysWidgetWrapper', [ 'wygCanvasSvc', function( wygCanvasSvc ) {
    return {
        restrict: 'E',
        scope: {
            wrappedWidgetName: '@'
        },
        templateUrl: app.getBaseUrlPath() + '/html/wys-widget-wrapper.directive.html',
        controller: [ '$scope', '$element', '$attrs', function( $scope, $element, $attrs ) {
            const DROP_AREA_INDICATIOR = 'wys-canvas-dropAreaIndicator';
            $scope.selected = false;
            $scope.isAlienElement = false;

            if( $element.hasClass( 'wys-alien-widgetLayout' ) ) {
                $scope.isAlienElement = true;
            }

            $scope.dropHandler = function( ev ) {
                ev.preventDefault();
                ev.stopPropagation();
                wygCanvasSvc.processCanvasDrop( ev, $scope.$parent.canvasData );
            };

            var emitToCanvasEditor = function( eventId, data ) {
                $scope.$emit( eventId, data );
            };

            $scope.showSelected = function( ev ) {
                if( ev ) {
                    ev.preventDefault();
                    ev.stopPropagation();
                }

                var actualWidgetId = $element.find( ':first' ).find( ':first' ).attr( 'id' );

                var data = { actualWidgetId: actualWidgetId, wrapperId: $attrs.id };
                !$scope.selected ? emitToCanvasEditor( 'registerWidgetId', data ) : emitToCanvasEditor( 'unRegisterWidgetId', data );

                //toggle selected state
                $scope.selected = !$scope.selected;
            };

            $scope.$on( 'deselectOtherWidgets', function( event, data ) {
                //unselect all other widgets
                if( data.wrapperId !== $attrs.id ) {
                    $scope.selected = false;
                }
            } );

            $scope.$on( 'selectWidget', function( event, data ) {
                var wrapperId;

                var currentSelectedWidget = $element.find( '#' + data.wysId );
                if( currentSelectedWidget.length > 0 ) {
                    wrapperId = currentSelectedWidget.attr( 'id' );
                }

                if( data.wysId !== undefined && ( data.wysId === $attrs.id || data.wysId === wrapperId ) && !$scope.isAlienElement ) {
                    $scope.showSelected();
                }
            } );

            $scope.dragEnterHandler = function( ev ) {
                ev.stopPropagation();
                $scope.target = ev.target;
                if( !$element.hasClass( DROP_AREA_INDICATIOR ) ) {
                    $element.addClass( DROP_AREA_INDICATIOR );
                }
            };

            $scope.dragleaveHandler = function( ev ) {
                ev.stopPropagation();
                if( $element.hasClass( DROP_AREA_INDICATIOR ) && $scope.target === ev.target ) {
                    $element.removeClass( DROP_AREA_INDICATIOR );
                }
            };

            $scope.$on( '$destroy', function handleDestroy() {
                $element.off( 'dragstart' );
                $element.off( 'dragover' );
                $element.off( 'click' );
                $element.off( 'dragenter' );
                $element.off( 'dragleave' );
            } );
        } ],
        transclude: true,
        link: function( scope, element, attrs ) {
            element.find( ':first' ).attr( 'draggable', 'true' );

            element.on( 'dragstart', function( event ) {
                event.stopPropagation();
                var draggedEleWrapperId = attrs.id;
                var data = {
                    isReorder: true,
                    draggedEleId: draggedEleWrapperId
                };
                event.originalEvent.dataTransfer.setData( 'text', JSON.stringify( data ) );
            } );

            element.find( ':first' ).on( 'click', function( event ) {
                if( !scope.isAlienElement ) {
                    scope.showSelected( event );
                } else {
                    event.preventDefault();
                    event.stopPropagation();
                }
            } );

            element.on( 'dragover', function( event ) {
                event.stopPropagation();
                event.preventDefault();
            } );

            element.on( 'dragenter', function( ev ) {
                scope.dragEnterHandler( ev );
            } );

            element.on( 'dragleave', function( event ) {
                scope.dragleaveHandler( event );
            } );

            element.on( 'drop', function( event ) {
                scope.dropHandler( event );
            } );
        }
    };
} ] );
