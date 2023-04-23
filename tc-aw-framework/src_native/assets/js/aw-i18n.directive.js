// Copyright (c) 2020 Siemens

/**
 * Directive to display localized text.
 *
 * @module js/aw-i18n.directive
 */
import app from 'app';
import ngModule from 'angular';
import _ from 'lodash';
import 'js/viewModelService';

/**
 * Directive to display localized text
 *
 * @example <aw-i18n></aw-i18n>
 *
 * @member aw-i18n
 * @memberof NgElementDirectives
 */
app.directive( 'awI18n', [ 'viewModelService', function( viewModelSvc ) {
    return {
        restrict: 'E',
        link: function( $scope, element ) {
            var declViewModel = viewModelSvc.getViewModel( $scope, true );

            var key = element.text();

            if( key && key.length !== 0 ) {
                var localizedText = _.get( declViewModel, key );

                if( localizedText ) {
                    ngModule.element( element ).text( localizedText );
                }
            }
        }
    };
} ] );
