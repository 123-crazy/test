// Copyright (c) 2020 Siemens

/**
 * @module js/aw-flex-column.directive
 */
import app from 'app';
import 'js/awFlexService';

/**
 * Define a column in the layout flex.
 * <P>
 * Defines a container that has the width of its parent container and a width specified by the width attribute.
 * These elements are stacked horizontally in their parent container.
 *
 * Attributes:
 * <P>
 * width - required - May be an integer (N) that is a proportion of 12. Such columns have a width of N/12 of the
 * container area after all fixed sized columns take their required space. Fixed sized columns are specified by
 * including an "f" suffix (e.g. width="2f"). These values specify "em" units which are proportional to the cascaded
 * font size.
 * <P>
 * offset - optional - Defines a proportional empty offset.
 * <P>
 * offset-right - optional - Defines a proportional empty offset on the right of a column.
 * <P>
 * justify - optional - "left", "center", "right" The default is "left".
 * <P>
 * id - optional - The id is used to match areas in two different layout for purposes of transitions between the
 * layouts.
 * <p>
 * when - adjust the view according to device (responsive flex layout)
 * @example <aw-flex-column width="4"></aw-flex-column>
 * @example <aw-flex-column width="3f" offset="1" justify="right"></aw-flex-column>
 * @example <aw-flex-column width="6" width="10f" color="red" when="xlarge: 2, large: 3, medium: 4, small:6, xsmall:12"> </aw-flex-column>
 *
 * @memberof NgDirectives
 * @member aw-flex-column
 */
app.directive( 'awFlexColumn', [ 'awFlexService', function( flexSvc ) {
    return {
        restrict: 'E',
        transclude: true,
        replace: true,
        scope: {},
        template: '<div class="aw-flex-column" data-ng-transclude></div>',
        link: {
            post: function( $scope, elements, attrs ) {
                var config = {
                    offset: attrs.offset,
                    offsetRight: attrs.offsetRight
                };

                flexSvc.setStyles( config, attrs, elements, 'width' );
                if( attrs.when ) {
                    flexSvc.setResponsiveClasses( attrs.when, elements );
                }
            }
        }
    };
} ] ); // End app.directive
