// Copyright (c) 2020 Siemens

/**
 * @module js/aw-column.directive
 */
import app from 'app';
import 'js/awRowColumnService';
// End define

/**
 * Define a column in the layout grid.
 * <P>
 * Defines a container that has the height of its parent container and a width specified by the width attribute.
 * These elements are stacked horizontally in their parent container.
 *
 * Attributes:
 * <P>
 * width - required - May be an integer (N) that is a proportion of 12. Such columns have a width of N/12 of the
 * container area after all fixed sized columns take their required space. Fixed sized columns are specified by
 * including an "f" suffix (e.g. width="2f"). These values specify "em" units which are proportional to the cascaded
 * font size.
 * <P>
 * offset - optional - Defines a proportional or fixed empty offset. The offset is to the left of any column that
 * has a justification of left or center. The offset is to the right of any column that has a justification of
 * right.
 * <P>
 * justify - optional - "left", "center", "right" The default is "left".
 * <P>
 * id - optional - The id is used to match areas in two different layout for purposes of transitions between the
 * layouts.
 * <p>
 * when - adjust the view according to device (responsive grid layout)
 * @example <aw-column width="4"></aw-column>
 * @example <aw-column width="3f" offset="1f" justify="right"></aw-column>
 * @example <aw-column width="6" height="10f" color="red" when="xlarge: 2, large: 3, medium: 4, small:6, xsmall:12"> </aw-column>
 *
 * @memberof NgDirectives
 * @member aw-column
 */
app.directive( 'awColumn', [ 'awRowColumnService', function( rowColSvc ) {
    return {
        restrict: 'E',
        transclude: true,
        replace: true,
        template: '<div class="aw-layout-column aw-layout-flexbox" data-ng-transclude></div>',
        link: {
            post: function( $scope, elements, attrs ) {
                // update element attributes with evaluated attributes
                elements.attr( 'width', attrs.width );
                elements.attr( 'height', attrs.height );
                elements.attr( 'offset', attrs.offset );
                elements.attr( 'justify', attrs.justify );
                elements.attr( 'color', attrs.color );
                elements.attr( 'align-content', attrs.alignContent );
                elements.attr( 'when', attrs.when );
                elements.attr( 'wrap-style', attrs.wrapStyle );

                // Initialize flexbox size and establish possible offsets and justifications
                rowColSvc.initRowOrColumn( elements );
            }
        }
    };
} ] ); // End app.directive
