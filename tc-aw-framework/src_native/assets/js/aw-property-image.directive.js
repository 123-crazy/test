// Copyright (c) 2020 Siemens

/**
 * Definition for the (aw-property-image) directive.
 *
 * @module js/aw-property-image.directive
 */
import app from 'app';
import 'js/iconService';

/**
 * Definition for the (aw-property-image) directive.
 *
 * @example TODO
 *
 * @member aw-property-image
 * @memberof NgElementDirectives
 */
app.directive( 'awPropertyImage', [ 'iconService', function( iconSvc ) {
    return {
        restrict: 'E',
        link: function( scope, element, attrs ) {
            if( element ) {
                element.append( iconSvc.getIcon( attrs.name ) );
            }
        }
    };
} ] );
