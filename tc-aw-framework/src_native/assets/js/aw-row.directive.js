// Copyright (c) 2020 Siemens

/**
 * @module js/aw-row.directive
 */
import app from 'app';
import 'js/awRowColumnService';

/**
 * Define a row in the layout grid.
 * <P>
 * Defines a container that has the width of its parent container and a height specified by the height attribute.
 * These elements are stacked vertically in their parent container.
 *
 * Attributes: height - required - May be an integer (N) that is a proportion of 12. Such rows have a height of N/12
 * of the container area after all fixed sized rows take their required space. Fixed sized rows are specified by
 * including an "f" suffix (e.g. height="2f"). These values specify "em" units which are proportional to the
 * cascaded font size.
 *
 * offset - optional - Defines a proportional or fixed empty offset. The offset is on top of any row that has a
 * justification of top or center. The offset is below any row that has a justification of bottom.
 *
 * justify - optional - "top", "center", "bottom" The default is "top".
 *
 * id - optional - The id is used to match areas in two different layout for purposes of transitions between the
 * layouts.
 *
 * @example <aw-row height="4"></aw-row>
 * @example <aw-row height="3f" offset="1f" justify="bottom"></aw-row>
 *
 * @memberof NgDirectives
 * @member aw-row
 */
app.directive( 'awRow', [ 'awRowColumnService', function( rowColSvc ) {
    return {
        restrict: 'E',
        transclude: true,
        replace: true,
        template: '<div class="aw-layout-row aw-layout-flexbox afx-base-parentElement" data-ng-transclude></div>',
        link: {
            post: function( $scope, elements, attrs ) {
                // update element attributes with evaluated attributes
                elements.attr( 'width', attrs.width );
                elements.attr( 'height', attrs.height );
                elements.attr( 'offset', attrs.offset );
                elements.attr( 'justify', attrs.justify );
                elements.attr( 'color', attrs.color );
                elements.attr( 'align-content', attrs.alignContent );
                elements.attr( 'wrap-style', attrs.wrapStyle );

                // For now, not needed for row
                // elements.attr( 'when', attrs.when );

                // Initialize flexbox size and establish possible offsets and justifications
                rowColSvc.initRowOrColumn( elements );
            }
        }
    };
} ] );
