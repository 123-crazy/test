// Copyright (c) 2020 Siemens

/**
 * Definition for the (aw-tile-icon) directive.
 *
 * @module js/aw-tile-icon.directive
 */
import app from 'app';
import _ from 'lodash';
import 'js/aw-icon.directive';
import 'js/awIconService';

/* eslint-disable-next-line valid-jsdoc*/
/**
 * Controller referenced from the 'div' <aw-tile-icon>
 *
 * @memberof NgController
 * @member awTileIconController
 */
app.controller( 'awTileIconController', [
    '$scope', 'awIconService',
    function( $scope, awIconSvc ) {
        var self = this; //eslint-disable-line
        var REGEX_THUMBNAIL_TICKET = /\/|\\|%2f|%5c/ig;

        /**
         * Process given input depending on icon information i.e. thumbnailImageTicket/__TYPEICON__/staticIcon
         *
         * @param {String} icon - thumbnail image ticket or __TYPEICON__ or icon name for static tiles
         * @param {Array} typeHierarchy - type Hierarchy array
         *
         * @return {String} icon information
         */
        self.processIconInfo = function( icon, typeHierarchy ) {
            if( !_.isEmpty( icon ) ) {
                if( REGEX_THUMBNAIL_TICKET.test( icon ) ) {
                    $scope.isThumbnail = true;
                    $scope.imageAltText = '';
                    return awIconSvc.buildThumbnailFileUrlFromTicket( icon );
                } else if( icon === '__TYPEICON__' && _.isArray( typeHierarchy ) ) {
                    $scope.isTypeIcon = true;
                    $scope.imageAltText = typeHierarchy[0];
                    return awIconSvc.getTypeIconFileUrlForTypeHierarchy( typeHierarchy );
                }
                // Get the icon contents from the icon service
                var iconDef = awIconSvc.getIconDef( icon );
                return iconDef !== awIconSvc.getMissingIcon() ? icon : 'home' + icon;
            }
            return null;
        };

        /**
         * Initialize tile icon controller
         */
        self.init = function() {
            if( $scope.icon ) {
                if( $scope.primary && $scope.primary === 'true' ) {
                    $scope.tileIcon = self.processIconInfo( $scope.icon.primaryIcon, $scope.icon.typeHierarchy );
                } else {
                    $scope.tileIcon = self.processIconInfo( $scope.icon.secondaryIcon, $scope.icon.typeHierarchy );
                }
            }
        };
    }
] );

/**
 * Definition for the (aw-tile-icon) directive.
 *
 * @example <aw-tile-icon icon="tile.icons" primary="true"></aw-tile-icon>
 *
 * @member aw-tile-icon
 * @memberof NgElementDirectives
 *
 * @returns {Object} - Directive's declaration details
 */
app.directive( 'awTileIcon', function() {
    return {
        restrict: 'E',
        scope: {
            icon: '<',
            primary: '@?'
        },
        controller: 'awTileIconController',
        templateUrl: app.getBaseUrlPath() + '/html/aw-tile-icon.directive.html',
        link: function( $scope, $element, attrs, ctrl ) {
            ctrl.init();
        }
    };
} );
