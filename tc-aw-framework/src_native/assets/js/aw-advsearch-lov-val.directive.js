// Copyright (c) 2020 Siemens

/**
 * This is a directive for rendering advanced searches with custom entries (preferred searches, other searches, and a separation line).
 * Everything else is similar to aw-property-lov-val.directive.
 *
 * @module js/aw-advsearch-lov-val.directive
 */
import app from 'app';
import 'js/localeService';
import 'js/aw.property.lov.controller';
import 'js/aw-property-error.directive';
import 'js/aw-property-image.directive';
import 'js/aw-property-lov-child.directive';
import 'js/aw-autofocus.directive';
import 'js/aw-when-advsearch-scrolled.directive';
import 'js/aw-widget-initialize.directive';
import 'js/exist-when.directive';
import 'js/aw-popup-panel2.directive';

/**
 * @member aw-advsearch-lov-val
 * @memberof NgElementDirectives
 */
app.directive( 'awAdvsearchLovVal', [
    'localeService',
    function( localeSvc ) {
        return {
            restrict: 'E',
            scope: {
                // prop comes from the parent controller's scope
                prop: '='
            },
            controller: 'awPropertyLovController',
            link: function( scope ) {
                localeSvc.getTextPromise().then( function( localizedText ) {
                    scope.lovNoValsText = localizedText.NO_LOV_VALUES;
                } );
                scope.i18n = {};
                localeSvc.getLocalizedTextFromKey( 'SearchCoreMessages.preferredSearches', true ).then( result => scope.i18n.preferredSearches = result );
                localeSvc.getLocalizedTextFromKey( 'SearchCoreMessages.regularSearches', true ).then( result => scope.i18n.regularSearches = result );
                scope.changeFunctionCustom = function() {
                    if( scope.prop.uiValue !== '' ) {
                        scope.changeFunction();
                    } else {
                        scope.dropDownVerticalAdj = 0;
                        scope.prop.dbValue = scope.prop.uiValue;
                        scope.prop.uiValues = [ scope.prop.uiValue ];
                        scope.prop.dbValues = [ scope.prop.dbValue ];
                        scope.listFilterText = scope.prop.uiValue;
                        scope.lovEntries = [];
                        if( scope.expanded ) {
                            scope.collapseList();
                        }
                    }
                };
                scope.popupTemplate = '/html/aw-advsearch-lov-val.popup-template.html';
            },
            templateUrl: app.getBaseUrlPath() + '/html/aw-advsearch-lov-val.directive.html'
        };
    }
] );
