// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * Defines tcoo controller that will be used by tcoo directive
 *
 * @module js/aw-tcoo-viewer.controller
 */
import * as app from 'app';
import ngModule from 'angular';
import $ from 'jquery';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import logger from 'js/logger';
import 'soa/dataManagementService';
import 'js/appCtxService';
import 'js/messagingService';
import 'js/aw-universal-viewer.controller';
import 'js/tcooService';
import localeSvc from 'js/localeService';
import notyService from 'js/NotyModule';
import AwPromiseService from 'js/awPromiseService';
import adapterService from 'js/adapterService';

'use strict';

/**
 * Defines tcoo controller that will be used by tcoo directive
 *
 * @member awTcooViewerController
 * @memberof aw-universal-viewer.controller.js
 */
app.controller( 'awTcooViewerController', [
    '$scope',
    '$element',
    '$controller',
    '$q',
    '$timeout',
    'soa_dataManagementService',
    'appCtxService',
    'messagingService',
    'tcooService',
    function( $scope, $element, $controller, $q, $timeout,
        dmsSvc, appCtxSvc, messagingSvc, tcooSvc ) {
        /**
         * Directive scope
         */
        var self = this;


        /**
         * Holds array of dom element id's that need to be hidden for protecting tcoo viewer from
         * potential loss of edits due to viewer discarding current file.
         */
        var _idsToHide = [ 'Awp0CancelCheckout', 'Awp0Checkin', 'Awp0LeftChevron', 'Awp0RightChevron' ];

        /**
         * Inherit universal viewer controller
         */
        ngModule.extend( self, $controller( 'awUniversalViewerController', {
            $scope: $scope
        } ) );

        /**
         * Describes the scope
         */
        $scope.whoAmI = 'awTcooViewerController';

        /**
         * Subscribe to preCheckin.failure event for keeping the viewer in edit mode
         */
        var checkInFailureEventSub = eventBus.subscribe( 'preCheckin.failure', function() {
            return $scope.revealViewer( 'edit', true );
        } );

        /**
         * Subscribe to cdm.updated event. In case parent checkout results in child dataset checkout,
         * need to perform action to prevent data loss due to explicit check in / cancel check out
         */
        var cdmUpdatedEventSub = eventBus.subscribe( 'cdm.updated', function( eventData ) {
            var viewerCtx = self.getViewerCtx();
            if( viewerCtx && viewerCtx.vmo ) {
                if( eventData && eventData.updatedObjects && eventData.updatedObjects.length > 0 ) {
                    var result = _.some( eventData.updatedObjects, function( object ) {
                        return object ? object.uid === viewerCtx.vmo.uid : false;
                    } );

                    if( result ) {
                        $timeout( function() {
                            var isCheckedOut = viewerCtx.vmo.props && viewerCtx.vmo.props.checked_out &&
                                viewerCtx.vmo.props.checked_out.dbValues[ 0 ] === 'Y';
                            var isModifiable = viewerCtx.vmo.props &&
                                viewerCtx.vmo.props.is_modifiable &&
                                viewerCtx.vmo.props.is_modifiable.dbValues[ 0 ] === '1';

                            if( isCheckedOut && isModifiable ) {
                                return $scope.revealViewer( 'edit', true );
                            }

                            return $scope.revealViewer( 'view', false );
                        }, 2000 );
                    }
                }
            }
        } );

        /**
         * Hides/Displays the previous and next chevrons on the viewer. This is called when the tcoo
         * viewer flips in & out of edit mode. Post editing the MS Office document, all the edits can
         * potentially be lost if user clicks on previous/next chevron as the viewer discard existing
         * file and loads a new one.
         *
         * @param hide boolean with value true indicating hide the chevron while false displays them
         */
        $scope.manageDataLossElements = function( hide ) {
            _.forEach( _idsToHide, function( id ) {
                var element = $( '#' + id );
                if( element && element.length > 0 ) {
                    if( hide ) {
                        element.addClass( 'aw-viewerjs-hideContent' );
                    } else {
                        element.removeClass( 'aw-viewerjs-hideContent' );
                    }
                }
            } );
        };

        $scope.revealViewer = function( mode, hideDataLossElements ) {
            $scope.getLaunchUrl( mode, mode === 'edit' ); //send the reveal in view on error as true only for edit mode
            //hide the carousel chevrons
            $scope.manageDataLossElements( hideDataLossElements );

            return tcooSvc.getResolvedPromise();
        };

        /**
         * Callback method from the controller prior to execution of checkin of viewer dataset
         *
         * @param {Object} Context ViewModelObject used by the viewer
         * @return {deferred.promise} Returns promise that will be resolved or rejected
         */
        $scope.preCheckin = function( vmo ) {
            var deferred = $q.defer();
            $scope.reloadIframe( deferred, 30, 3000, vmo );
            return deferred.promise;
        };

        $scope.createButton = function( label, callback ) {
            return {
                addClass: 'btn btn-notify',
                text: label,
                onClick: callback
            };
        };

        /**
         * There is no action tcoo needs to do before cancel-checkout. Just need to send users confirmation so that
         * users won't lose their changes by accident.
         */
        $scope.preCancelCheckout = function() {
            var deferred = AwPromiseService.instance.defer();
            var fileName = $scope.data.fileData ? $scope.data.fileData.file.cellHeader1 : 'File';
            var message = $scope.i18n.cancelCheckoutMessageText.replace( '{0}', fileName );
            var buttonArray = [];
             // cancel button
             buttonArray.push( $scope.createButton( $scope.i18n.cancel, function( $noty ) {
                $noty.close();
            } ) );
            // continue button
            buttonArray.push( $scope.createButton( $scope.i18n.continue, function( $noty ) {
                $noty.close();
                deferred.resolve();
                return deferred.promise;
            } ) );

            notyService.showWarning( message, buttonArray );

            return deferred.promise;
        };

        /**
         * Fetches the launch url using tcooService
         *
         * @param {String} action name. view|edit
         * @param {Boolean} whenther to retry revealing viewer in view mode in case of error
         */
        $scope.getLaunchUrl = function( action, revealViewerOnError ) {
            /*
             * -------------DO NOT REMOVE ------------------ Developer code for wopi agnostic debugging.
             * ---------------------------------------------
             */
            //if( action ){ return; }

            $scope.$evalAsync( function() {
                $scope.showProgress = true;
            } );

            // input for invokeService method
            var selectedObj = appCtxSvc.getCtx( 'selected' );
            var parentObj = adapterService.getAdaptedObjectsSync( [ selectedObj ] );

            var launchInfoInput = {
                clientId: 'view' + $scope.data.datasetData.uid,
                objectUid: $scope.data.datasetData.uid,
                objectClass: $scope.data.datasetData.modelType.uid,
                action: action,
                locale: localeSvc.getLocale(),
                extraInfo: {
                    correlationID: logger.getCorrelationID(),
                    userId: appCtxSvc.ctx.userSession.props.user_id.value,
                    group: appCtxSvc.ctx.userSession.props.group.uiValues[0],
                    role: appCtxSvc.ctx.userSession.props.role.uiValues[0],
                    parentObjUid: parentObj[0].uid,
                    parentObjType: parentObj[0].type
                }
            };

            //get the launch url and relation name
            var tcooPromise = tcooSvc.getLaunchUrl( launchInfoInput );
            if( tcooPromise ) {
                tcooPromise.then( function( response ) {
                    $scope.processLaunchInfoResponse( response, action, revealViewerOnError );
                }, function( err ) {
                    $scope.showProgress = false;
                    messagingSvc.showError( $scope.i18n.tcoowebConnectionFailed );
                } );
            } else {
                logger.error( 'tcooSvc.getLaunchUrl failed to return promise' );
            }
        };

        $scope.ifToRefreshViewer = function( relation ) {
            var refreshViewer =  false;
            // only move on when the dataset is checked out
            if( $scope.data.datasetData.props.checked_out.dbValues[ 0 ] === 'Y' ) {
                // get the relation from response and set refreshTcooViewer flag in viewerContext
                // when the relation is TC_Attaches

                if( relation ) {
                    if( relation === 'TC_Attaches' ) {
                        refreshViewer = true;
                    }
                } else {
                    // there is no relation object in the response, that means the selected obj is a dataset
                    // so the checkin will act on the dataset, so pre-refresh is needed.
                    refreshViewer = true;
                }
            }
            return refreshViewer;
        };

        $scope.processLaunchInfoResponse = function( response, action, revealViewerOnError ) {
            if( response && response.data ) {
                var data = response.data;
                if( data.errorString ) {
                    $scope.showProgress = false;
                    logger.error( data.errorString );
                    var fileName = $scope.data.fileData ? $scope.data.fileData.file.props.object_string.uiValues[0] : 'File';
                    messagingSvc.showError( $scope.i18n.fileOpenSystemError.replace( '{0}', fileName ) );
                    if( data.oosUrlString === null && action !== 'view' ) {
                        $scope.revealViewer( 'view', false );
                    } else {
                        if( revealViewerOnError ) {
                            $scope.revealViewer( action, false );
                        }
                    }
                } else {
                    // get the launch url
                    if( data.oosUrlString ) {
                        $scope.createViewerIframe( data );
                    } else {
                        logger.error( 'getting null response from service.' );
                    }

                    var refreshViewer = $scope.ifToRefreshViewer( data.relationType );

                    appCtxSvc.registerPartialCtx( 'viewerContext.preRefreshTcooViewer', refreshViewer );
                }
            } else {
                logger.error( 'tcooSvc.getLaunchUrl failed to return any response' );
            }
        };

        /**
         * creating iframe for MS OO
         *
         * @param {Object} response of a soa call
         */
        $scope.createViewerIframe = function( response ) {
            // if there is any iframe created earlier then remove it
            $scope.$evalAsync( function() {
                $scope.showProgress = false;

                $scope.tcooParams = {
                    accessToken: response.accessToken,
                    accessTokenTtl: response.accessTokenTtl
                };
            } );

            $timeout( function() {
                var formElement = $element.find( 'form.aw-viewerjs-officeForm' );
                if( formElement.length === 0 ) {
                    $element

                        .find( '#tcooFrameParent input[name^=\'access_token\']' )


                        .wrapAll(
                            '<form class="aw-viewerjs-officeForm" name="officeForm" target="officeFrame" action="" method="post" enctype="application/x-www-form-urlencoded"></form>' );
                }


                if( document && document.officeForm ) {
                    document.officeForm.action = response.oosUrlString;


                    $element.find( 'form.aw-viewerjs-officeForm' )[ 0 ].submit();
                }
            } );
        };

        /**
         * Reloads the iFrame when one of two conditions is satisfied: 1. The last modified date of vmo
         * has been updated OR 2. Recurse timeout break after completing # iterations
         *
         *
         * @param {deferred} Deferred promise that needs to be resolved or rejected
         * @param {Integer} counter of iterations before reloading the frame
         * @param {Integer} Timeout in milliseconds to wait
         * @param {Object} Context ViewModelObject used by the viewer
         */
        $scope.reloadIframe = function( deferred, counter, interval, vmo ) {
            $scope.$evalAsync( function() {
                $scope.showProgress = true;
            } );

            var currLMD = vmo.props.last_mod_date.dbValues[ 0 ];
            $scope.recurseTimeout( counter, interval, deferred, vmo, currLMD );
        };

        /**
         * Recurse function that breaks when one of two conditions is satisfied: 1. The last modified
         * date of vmo has been updated OR 2. Recurse timeout break after completing # iterations
         *
         *
         * @param {Integer} counter of iterations before reloading the frame
         * @param {Integer} Timeout in milliseconds to wait
         * @param {deferred} Deferred promise that needs to be resolved or rejected
         * @param {Object} angular element that holds the iFrame
         * @param {Object angular iFrame element that needs to be added to the frameParent
         * @param {Object} Context ViewModelObject used by the viewer
         * @param {String} Current last modified date
         */
        $scope.recurseTimeout = function( counter, timeout, deferred, vmo, currLMD ) {
            $timeout( function() {
                eventBus.publish( 'preCheckinGetProperties' );
                var recurse = true;
                var serverLMD = vmo.props.last_mod_date.dbValues[ 0 ];
                if( currLMD !== serverLMD ) {
                    //this means WOPI updated the dataset named reference
                    recurse = false;
                }

                if( counter === 0 ) {
                    recurse = false; //this means that even after n iterations, the lmd is not updated. Keep viewer in edit mode
                    deferred.reject();
                }

                if( recurse ) {
                    counter--;
                    $scope.recurseTimeout( counter, timeout, deferred, vmo, currLMD );
                } else {
                    $scope.$evalAsync( function() {
                        $scope.showProgress = false;
                    } );
                    deferred.resolve();
                }
            }, timeout );
        };

        /**
         * checks whether user is sponsorable or not and show error if not sponsorable.
         */
        $scope.isUserSponsored = function() {
            var userVmo = appCtxSvc.getCtx( 'user' );
            var propName = 'fnd0Sponsorable';
            var fileName = $scope.data.headerProperties[ 0 ].cmdContext ? $scope.data.headerProperties[ 0 ].cmdContext.props.ref_list.uiValues[ 0 ] :
                'File';
            var errorMsg = $scope.i18n.nonSponsoredUserMessage.replace( '{0}', fileName );
            var loggerMsg = 'Permission denied. User is not sponsorable.';
            if( !userVmo.props.hasOwnProperty( propName ) ) {
                var isUserSponsorablePromise = dmsSvc.getProperties( [ userVmo.uid ], [ propName ] );
                isUserSponsorablePromise.then( function( response ) {
                    if( response && response.modelObjects &&
                        response.modelObjects[ userVmo.uid ].props[ propName ].dbValues[ 0 ] === '0' ) {
                        $scope.$evalAsync( function() {
                            $scope.hasError = true;
                            $scope.errorMsg = errorMsg;
                        } );

                        messagingSvc.showError( errorMsg );
                        logger.error( loggerMsg );
                    }
                } );
            } else {
                if( userVmo.props.fnd0Sponsorable.dbValues[ 0 ] === '0' ) {
                    $scope.$evalAsync( function() {
                        $scope.hasError = true;
                        $scope.errorMsg = errorMsg;
                    } );
                    messagingSvc.showError( errorMsg );
                    logger.error( loggerMsg );
                }
            }
        };

        /**
         * Sets the launch url based for view or edit mode. If the vmo is checked out by current user,
         * then loads the file in edit mode else view mode
         */
        self.preparelaunchUrl = function() {
            $timeout( function() {
                var action = 'view';
                var revealViewerOnError = false;
                var viewerCtx = self.getViewerCtx();
                if( viewerCtx && viewerCtx.vmo ) {
                    var isCheckedOut = viewerCtx.vmo.props && viewerCtx.vmo.props.checked_out &&
                        viewerCtx.vmo.props.checked_out.dbValues[ 0 ] === 'Y';
                    var isModifiable = viewerCtx.vmo.props && viewerCtx.vmo.props.is_modifiable &&
                        viewerCtx.vmo.props.is_modifiable.dbValues[ 0 ] === '1';

                    if( isCheckedOut && isModifiable ) {
                        action = 'edit';
                        revealViewerOnError = true;
                        $scope.manageDataLossElements( true );
                    } else {
                        $scope.manageDataLossElements( false );
                    }
                }

                $scope.getLaunchUrl( action, revealViewerOnError );
                $scope.isUserSponsored();
            }, 2000 );
        };

        /**
         * Check to see if AW is running in Office Client and set it on $scope. html file has "exist-when"
         * set on the viewer div. So the viewer will only display when it is NOT hosted in Office Client.
         */
        self.hostedInOfficeClient = function() {
            var hostedInOC = false;
            var hosted = appCtxSvc.getCtx( 'aw_hosting_enabled' );
            if( hosted && hosted === true ) {
                var hostType = appCtxSvc.getCtx( 'aw_host_type' );
                if( hostType && hostType === 'OC' ) {
                    hostedInOC = true;
                }
            }

            $scope.hostedInOC = hostedInOC;
        };

        /**
         * Cleanup up when this scope is destroyed.
         */
        $scope.$on( '$destroy', function() {
            //remove suppressed commands if any
            $scope.manageDataLossElements( false );

            $scope.hasError = false;
            $scope.whoAmI = null;
            _idsToHide = null;
            eventBus.unsubscribe( checkInFailureEventSub );
            eventBus.unsubscribe( cdmUpdatedEventSub );
        } );
    }
] );
