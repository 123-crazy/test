// Copyright (c) 2020 Siemens

/**
 * @module js/aw-search-breadcrumb.directive
 */
import app from 'app';
import ngModule from 'angular';
import 'js/aw-popup-panel.directive';
import 'js/aw-search-breadcrumb.controller';
import 'js/aw-property-image.directive';
import 'js/localeService';
import 'js/appCtxService';
import 'js/aw-repeat.directive';
import 'js/exist-when.directive';
import 'js/aw-list.directive';
import 'js/aw-default-cell.directive';
import 'js/aw-popup-panel.directive';
import 'js/aw-search-box.directive';
import 'js/aw-icon.directive';
import 'js/aw-enter.directive';
import 'js/viewModelService';
import 'js/aw-scrollpanel.directive';

/**
 * Definition for the (aw-search-breadcrumb) directive.
 *
 * @member aw-search-breadcrumb
 * @memberof NgElementDirectives
 * @param {localeService} localeSvc - Service to use.
 * @param {$q} $q - Service to use.
 * @param {appCtxService} appCtxService - Service to use.
 * @returns {exports} Instance of this service.
 */
app.directive( 'awSearchBreadcrumb', [
    'localeService',
    '$q',
    'appCtxService',
    function( localeSvc, $q, appCtxService ) {
        return {
            restrict: 'E',
            scope: {
                provider: '=',
                breadcrumbConfig: '='
            },
            link: function( scope, element ) {
                scope.ctx = appCtxService.ctx;
                scope.i18n = {};
                localeSvc.getLocalizedTextFromKey( 'SearchCoreMessages.breadcrumbRemove', true ).then( result => scope.i18n.breadcrumbRemove = result );

                localeSvc.getTextPromise().then( function( localTextBundle ) {
                    scope.loadingMsg = localTextBundle.LOADING_TEXT;
                } );
                localeSvc.getLocalizedText( 'UIMessages', 'clearBreadCrumb' ).then( function( result ) {
                    scope.clearBreadCrumb = result;
                } );
                localeSvc.getLocalizedText( 'UIMessages', 'updateSearchDropDownTitle' ).then( function( result ) {
                    scope.updateSearchDropDownTitle = result;
                } );
                scope.showSearchUpdateCriteriaPopUp = function( event ) {
                    scope.showpopupUpdateCriteria = true;
                    $q.all( scope.$applyAsync( scope.showpopupUpdateCriteria ) ).then( function() {
                        scope.$applyAsync( function() {
                            var myPopup = ngModule.element( element ).find( '.aw-search-updateCriteriaPopup' );
                            myPopup.scope().$broadcast( 'awPopupWidget.open', {
                                popupUpLevelElement: ngModule.element( event.currentTarget.parentElement )
                            } );
                        } );
                    } );
                };
            },
            controller: 'awSearchBreadcrumbController',
            templateUrl: app.getBaseUrlPath() + '/html/aw-search-breadcrumb.directive.html'
        };
    }
] );
