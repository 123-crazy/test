// Copyright (c) 2020 Siemens

/**
 * Angular doesn't support ng-change on file input, so add custom directive to handle on file selection change.
 *
 * @module js/on-file-change.directive
 */
import app from 'app';
import $ from 'jquery';
import _ from 'lodash';
import browserUtils from 'js/browserUtils';
import eventBus from 'js/eventBus';
import domUtils from 'js/domUtils';
import viewModelSvc from 'js/viewModelService';
import declDragAndDropService from 'js/declDragAndDropService';

const dom = domUtils.DOMAPIs;
/**
 * Angular doesn't support ng-change on file input, so add custom directive to handle on file selection change.
 *
 * @example <input type="file" ng-model="file.fmsFile" ng-required="true" accept="{{typeFilter}}" name="fmsFile"
 *          on-file-change="updateFile"/>
 *
 * @member on-file-change
 * @memberof NgAttributeDirectives
 */
app.directive( 'onFileChange', function() {
    return {
        restrict: 'A',
        require: 'ngModel',
        link: function( $scope, element, attrs, ngModel ) {
            var onChangeHandler = $scope.$eval( attrs.onFileChange );

            const highlightWidget = ( eventData ) => {
                if( !_.isUndefined( eventData ) && !_.isUndefined( eventData.targetElement ) && eventData.targetElement.classList ) {
                    var event = eventData.event;
                    var isHighlightFlag = eventData.isHighlightFlag;
                    var target = eventData.targetElement;
                    var isGlobalArea = eventData.isGlobalArea;

                    if( target.classList.contains( 'aw-widgets-chooseordropfile' ) ) {
                        var chooseFileWidget = target.querySelector( '.aw-file-upload-fileName' );
                        if( isHighlightFlag ) {
                            // on entering a valid cell item within a cellList, apply stlye as in LCS-148724
                            chooseFileWidget.classList.add( 'aw-widgets-dropframe' );
                            chooseFileWidget.classList.add( 'aw-theme-dropframe' );
                        } else {
                            chooseFileWidget.classList.remove( 'aw-theme-dropframe' );
                            chooseFileWidget.classList.remove( 'aw-widgets-dropframe' );
                        }
                    } else if( target.classList.contains( 'aw-file-upload-fileName' ) ) {
                        if( isHighlightFlag ) {
                            // on entering a valid cell item within a cellList, apply stlye as in LCS-148724
                            target.classList.add( 'aw-widgets-dropframe' );
                            target.classList.add( 'aw-theme-dropframe' );
                        } else {
                            target.classList.remove( 'aw-theme-dropframe' );
                            target.classList.remove( 'aw-widgets-dropframe' );
                        }
                    }
                }
            };

            if( browserUtils.isNonEdgeIE ) {
                var oldValue = element.val();
                var newValue = '';

                var fileChanged = function( event ) {
                    oldValue = newValue;
                    if( element.val() === oldValue ) {
                        newValue = '';
                    } else {
                        newValue = element.val();
                    }
                    if( oldValue !== newValue ) {
                        element.val( newValue );
                        $scope.$apply( function() {
                            ngModel.$setViewValue( newValue );
                            ngModel.$render();
                        } );

                        if( onChangeHandler ) {
                            event.target.value = newValue;
                            onChangeHandler( event );
                        }
                    }
                };

                element.bind( 'click', function( clickEvent ) {
                    $( 'body' ).on( 'focusin', function() {
                        _.defer( function() {
                            fileChanged( clickEvent );
                        } );
                        $( 'body' ).off( 'focusin' );
                    } );
                } );
            } else {
                element.bind( 'change', function( event ) {
                    $scope.$apply( function() {
                        ngModel.$setViewValue( element.val() );
                        ngModel.$render();
                    } );

                    if( onChangeHandler ) {
                        onChangeHandler( event );
                    }
                } );

                /**
                 * *Setup drag and drop on file upload when drag and drop handlers are defined for
                 * the view it resides in
                 * */
                var declViewModel = viewModelSvc.getViewModel( $scope, true );
                let dropProviders = declViewModel ? _.get( declViewModel, '_internal.dropHandlers' ) : null;
                if( dropProviders ) {
                    const dropFile = () => {
                        event.target.files = event.dataTransfer.files;
                        element.trigger( 'change', event );
                    };

                    const callbackAPIs = {
                        highlightTarget: highlightWidget,
                        updateFileData: dropFile,
                        getTargetElementAndVmo: ( event ) => {
                            let targetVMO = null;
                            let target = dom.closest( event.target, '.aw-widgets-chooseordropfile' );
                            return {
                                targetElement: target,
                                targetVMO: targetVMO
                            };
                        }
                    };
                    declDragAndDropService.setupDragAndDrop( element[ 0 ], callbackAPIs, declViewModel );
                } else {
                    element.bind( 'dragover', function( event ) {
                        event.originalEvent.preventDefault();
                        event.originalEvent.stopPropagation();
                        event.originalEvent.dataTransfer.dropEffect = 'copy';
                        highlightWidget( { isHighlightFlag: true, targetElement: dom.closest( event.target, '.aw-widgets-chooseordropfile' ) } );
                    } );
                    element.bind( 'dragleave', function( event ) {
                        event.originalEvent.preventDefault();
                        event.originalEvent.stopPropagation();
                        highlightWidget( { isHighlightFlag: false, targetElement: dom.closest( event.target, '.aw-widgets-chooseordropfile' ) } );
                    } );
                    element.bind( 'drop', function( event ) {
                        event.target.files = event.originalEvent.dataTransfer.files;
                        element.trigger( 'change', event );
                    } );
                }
                eventBus.subscribe( 'dragDropEvent.highlight', highlightWidget );

                element.bind( 'click', function( event ) {
                    event.target.value = '';

                    // 'change' event is not fired on Chrome
                    // call change handle to validate explicitly
                    if( onChangeHandler ) {
                        onChangeHandler( event );
                    }
                } );
            }
        }
    };
} );
