// Copyright 2022 Siemens Product Lifecycle Management Software Inc.

/**
 * Directive to support markup cell implementation.
 *
 * @module js/aw-markup-cell.directive
 */
import app from 'app';
import markupViewModel from 'js/MarkupViewModel';
import markupService from 'js/Awp0MarkupService';
import 'js/aw-property-image.directive';
import 'js/aw-avatar.directive';

'use strict';

/**
 * Directive for markup cell implementation.
 *
 * @example <aw-markup-cell vmo="item"></aw-markup-cell>
 *
 * @member aw-markup-cell
 * @memberof NgElementDirectives
 */
app.directive( 'awMarkupCell', [
    function() {
        return {
            restrict: 'E',
            scope: {
                vmo: '='
            },
            templateUrl: app.getBaseUrlPath() + '/html/aw-markup-cell.directive.html',
            controller: [ '$scope', function( $scope ) {
                $scope.toggleGroup = markupService.toggleGroup;
                $scope.isIndented = function() {
                    var markup = $scope.vmo;
                    var userObj = markup.userObj;
                    markup.isEditable = markupViewModel.isEditable( markup );
                    markup.isReplyable = markupViewModel.isReplyable( markup );
                    markup.isDeletable = markupViewModel.isDeletable( markup );
                    if( userObj ) {
                        markup.userImage = userObj.hasThumbnail ? userObj.thumbnailURL : userObj.typeIconURL;
                    }

                    return markupViewModel.isIndented( markup );
                };
            } ]
        };
    }
] );
