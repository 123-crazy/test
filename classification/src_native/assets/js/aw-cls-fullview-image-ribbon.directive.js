// @<COPYRIGHT>@
// ==================================================
// Copyright 2018.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/aw-cls-fullview-image-ribbon.directive
 */
import app from 'app';
import $ from 'jquery';
import _ from 'lodash';
import browserUtils from 'js/browserUtils';
import eventBus from 'js/eventBus';
import 'js/aw-icon-button.directive';
import 'js/aw-image.directive';
import 'js/aw-include.directive';
import 'js/aw-model-thumbnail.directive';
import 'js/exist-when.directive';
import 'js/visible-when.directive';
import 'js/aw-panel.directive';
import 'js/aw-repeat.directive';
import 'js/viewModelService';


var _ribbonSizeCheckDebounceTime = browserUtils.isNonEdgeIE ? 2000 : 1000;

/**
 * Description
 *
 * @example <aw-cls-fullview-image-ribbon></aw-cls-fullview-image-ribbon>
 *
 * @member aw-cls-fullview-image-ribbon
 * @memberof NgElementDirectives
 */
app.directive( 'awClsFullviewImageRibbon', [ 'viewModelService', function( viewModelSvc ) {
    return {
        restrict: 'E',
        scope: {
            showChevrons: '@'
        },
        controller: [ '$scope', function( $scope ) {
            var declViewModel = viewModelSvc.getViewModel( $scope, true );

            $scope.selectImage = function( imageObj ) {
                //deselect all images
                var viewerArray = declViewModel.viewDataArray;
                for( var i = 0; i < viewerArray.length; ++i ) {
                    viewerArray[ i ].selected = false;
                }

                imageObj.selected = true;
                declViewModel.index = imageObj.imageIndex;

                eventBus.publish( 'classifyTab.imageSelected' );
            };
        } ],
        link: function( scope, $element ) {
            var declViewModel = viewModelSvc.getViewModel( scope, true );
            scope.showChevrons = true;
            scope._ribbonWidthPrev = null;
            scope._ribbonWidth = null;
            scope.previousCellId = scope.data.selectedCell ? scope.data.selectedCell.cellInternalHeader1 : null;
            scope.checkShowChevrons = function() {
                var ribbonWidth = scope._ribbonWidth;
                var allChildrenWidth = 0;

                //do stuff
                var childrenArray = $( scope.thumbnailContainer ).find( 'div#CellThumbnail' );
                _.forEach( childrenArray, function( child ) {
                    allChildrenWidth += child.clientWidth;
                } );

                //If the size of the combined width of the children is greater than ribbon size, show chevrons
                scope.showChevrons = allChildrenWidth > ribbonWidth;
            };

            /**
             * Setup to delay query of our thumbnailContainer and get the size
             */
            scope._pingRibbonSizeCheck = _.debounce( function pingRibbonSizeCheck() {
                if( $element && $element[ 0 ] && !scope.thumbnailContainer ) {
                    scope.thumbnailContainer = $element.find( 'div.aw-cls-image-thumbnail-preview-container.aw-clspanel-thumbnailRibbonContainer' )[ 0 ];
                }

                //If there is no previous size, get current size and determine chevron visibility
                if( !scope._ribbonWidthPrev && scope.thumbnailContainer ) {
                    scope._ribbonWidthPrev = scope.thumbnailContainer.clientWidth;
                    scope._ribbonWidth = scope._ribbonWidthPrev;
                    scope.checkShowChevrons();
                } else if( scope.thumbnailContainer ) {
                    scope._ribbonWidth = scope.thumbnailContainer.clientWidth;
                    var cellHeader = scope.data.selectedCell ? scope.data.selectedCell.cellInternalHeader1 : null;
                    //If the size of the ribbon has changed, OR the selectedCell has been changed, then continue
                    if( scope._ribbonWidthPrev !== scope._ribbonWidth || cellHeader !== scope.previousCellId ) {
                        scope.checkShowChevrons();
                        scope._ribbonWidthPrev = scope._ribbonWidth;
                        scope.previousCellId = cellHeader;
                    }
                }
            }, _ribbonSizeCheckDebounceTime, {
                maxWait: 5000,
                trailing: true,
                leading: false
            } );

            // Watch for width changes. Look at aw-tab-container.directive for code like this.
            scope.$watch( function _watchRibbonSizeCheck() {
                scope._pingRibbonSizeCheck();
            } );

            //Listen to showImage event
            eventBus.subscribe( 'classify.pingRibbonSizeCheck',
            function() {
                scope._pingRibbonSizeCheck();
            } );

            //Listen to prevClick event
            eventBus.subscribe( 'classify.prevChevronClick',
            function() {
                scope.checkShowChevrons();
                if ( scope.showChevrons ) {
                    declViewModel.ribbonIncr -= 1;
                }
            } );

            //Listen to nextClick event
            eventBus.subscribe( 'classify.nextChevronClick',
            function() {
                scope.checkShowChevrons();
                if ( scope.showChevrons ) {
                    declViewModel.ribbonIncr += 1;
                }
            } );

            scope.$on( '$destroy', function() {
                scope._pingRibbonSizeCheck.cancel();
                scope.thumbnailContainer = null;

                scope.showChevrons = false;
                scope._ribbonWidthPrev = null;
                scope._ribbonWidth = null;

                if( $element ) {
                    $element.remove();
                    $element = null;
                }
            } );
        },
        templateUrl: app.getBaseUrlPath() + '/html/aw-cls-fullview-image-ribbon.directive.html'
    };
} ] );
