// Copyright (c) 2020 Siemens
/* eslint-env es6 */

/**
 * @module js/aw-splitter.directive
 */

// module
import app from 'app';
import splitterSvc from 'js/awSplitterService';

// service
import AwTimeoutService from 'js/awTimeoutService';

/**
 * Define a splitter between two elements.
 * <P>
 * Defines a standard splitter control between two adjacent elements. A horizontal splitter or vertical splitter can
 * be placed.
 *
 * @example Splitter not between <aw-row> or <aw-column> elements
 * @example <aw-splitter min-size-area-1="317" min-size-area-2="300" direction="vertical"></aw-splitter>
 *
 * @example Horizontal Splitter
 * @example <aw-row height="6"></aw-row>
 * @example <aw-splitter></aw-splitter>
 * @example <aw-row height="6"></aw-row>
 *
 * @example Vertical Splitter
 * @example <aw-column width="6"></aw-column>
 * @example <aw-splitter></aw-splitter>
 * @example <aw-column width="6"></aw-column>
 *
 * @memberof NgDirectives
 * @member aw-splitter
 */
export default class AwSplitter {
    constructor() {
        // members
        this.restrict = 'E';

        this.scope = {
            minSize1: '@?', // optional
            minSize2: '@?', // optional
            direction: '@?', // optional
            isPrimarySplitter: '@?' // optional
        };

        this.replace = true;

        this.templateUrl = app.getBaseUrlPath() + '/html/aw-splitter.directive.html';

        this.timeout = AwTimeoutService.instance;
    }

    // link is postLink implicitly. Refer to:
    // https://stackoverflow.com/questions/22105336/can-angularjs-directive-pre-link-and-post-link-functions-be-customized
    link( scope, elements, attributes ) {
        this.timeout( function() {
            if( attributes.isprimarysplitter === 'true' ) {
                scope.$on( 'viewModeChanged', () => {
                    splitterSvc.initSplitter( elements, attributes );
                } );
            }
            splitterSvc.initSplitter( elements, attributes );
        } );
    }
}

app.directive( 'awSplitter', () => new AwSplitter() );
