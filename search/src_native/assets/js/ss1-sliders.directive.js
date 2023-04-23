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
 * @module js/ss1-sliders.directive
 */
import app from 'app';
import 'js/aw-i18n.directive';
import 'js/aw-slider.directive';
import 'js/ss1-sliders.directive';

'use strict';
/*eslint-disable-next-line valid-jsdoc*/
/**
 * Directive to show search box and suggestions
 *
 * @example <ss1-sliders></ss1-sliders>
 *
 */
app.directive( 'ss1Sliders', [
    function() {
        return {
            templateUrl: app.getBaseUrlPath() + '/html/ss1-sliders.directive.html'
        };
    }
] );
