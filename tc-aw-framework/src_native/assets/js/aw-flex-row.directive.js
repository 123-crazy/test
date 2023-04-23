// Copyright (c) 2020 Siemens

/**
 * @module js/aw-flex-row.directive
 */
import app from 'app';
import _ from 'lodash';
import 'js/awFlexService';

/**
 * Define a row in the layout flex.
 * <P>
 * Defines a container that has the height of its parent container and a height specified by the height attribute.
 * These elements are stacked vertically in their parent container.
 *
 * Attributes:
 * height - required - May be an integer (N) that is a proportion of 12. Such rows have a height of N/12
 * of the container area after all fixed sized rows take their required space. Fixed sized rows are specified by
 * including an "f" suffix (e.g. height="2f"). These values specify "em" units which are proportional to the
 * cascaded font size.
 *
 * offset - optional - Defines a proportional empty offset. This offset is on top of any row.
 * offset-bottom - optional - Defines a proportional empty offset. This offset is on bottom of any row.
 *
 * justify - optional - "top", "center", "bottom" The default is "top".
 * align-content - optional - "start", "center", "end" The default is "start".
 *
 * id - optional - The id is used to match areas in two different layout for purposes of transitions between the
 * layouts.
 *
 * @example <aw-flex-row height="4"></aw-flex-row>
 * @example <aw-flex-row height="3f" offset="1" justify="bottom"></aw-flex-row>
 *
 * @memberof NgDirectives
 * @member aw-flex-row
 */
app.directive( 'awFlexRow', [ 'awFlexService', function( flexSvc ) {
    return {
        restrict: 'E',
        transclude: true,
        replace: true,
        scope: {},
        template: '<div class="aw-flex-row" data-ng-transclude></div>',
        link: {
            post: function( $scope, elements, attrs ) {
                var config = {
                    offset: attrs.offset,
                    offsetBottom: attrs.offsetBottom
                };

                flexSvc.setStyles( config, attrs, elements, 'height' );
            }
        }
    };
} ] );
