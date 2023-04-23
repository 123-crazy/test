// @<COPYRIGHT>@
// ==================================================
// Copyright 2017.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/aw-model-thumbnail.directive
 */
import * as app from 'app';
import fmsUtils from 'js/fmsUtils';
import browserUtils from 'js/browserUtils';
import 'js/awIconService';
import 'js/aw-image.directive';

/**
 * Display the thumbnail (or type icon if thumbnail doesn't exist) associated with the given 'ViewModelObject'.
 * 
 * @example <aw-model-thumbnail vmo="[ViewModelObject]"></aw-model-thumbnail>
 * @example <aw-model-thumbnail vmo="[ViewModelObject] image-ticket='imageFileticket' "></aw-model-thumbnail>
 * 
 * The imageTicket property is optional. It's firstly used to get the image file URL. If it's not given then use
 * awp0ThumbnailImageTicket of the input ViewModelObject, the type icon is the last fall back.
 * 
 * @memberof NgDirectives
 * @member aw-model-thumbnail
 */
app.directive( 'awModelThumbnail', [
    'awIconService',
    function( awIconSvc ) {
        return {
            restrct: 'E',
            scope: {
                vmo: '=',
                imageTicket: '=?'
            },
            link: function( $scope, $element ) {
                $scope.hasThumbnail = false;
                $scope.imageUrl = '';
                $element.addClass( "aw-layout-full" );
                $element.addClass( "aw-xrt-thumbnailImage" );

                var ticket = $scope.imageTicket;
                if( !ticket && $scope.vmo && $scope.vmo.props && $scope.vmo.props.awp0ThumbnailImageTicket ) {
                    ticket = $scope.vmo.props.awp0ThumbnailImageTicket.dbValues[ 0 ];
                }

                if( ticket && ticket.length > 28 ) {
                    $scope.hasThumbnail = true;
                    $scope.imageUrl = browserUtils.getBaseURL() + "fms/fmsdownload/" +
                        fmsUtils.getFilenameFromTicket( ticket ) + "?ticket=" + ticket;
                }

                //show type icon instead if thumbnail doesn't exist
                if( !$scope.hasThumbnail ) {
                    $scope.imageUrl = awIconSvc.getTypeIconFileUrl( $scope.vmo );
                }
            },
            template: '<aw-image source="imageUrl" is-icon="!hasThumbnail"></aw-image>'
        };
    }
] );
