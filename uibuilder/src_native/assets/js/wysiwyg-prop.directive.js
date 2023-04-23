// Copyright (c) 2020 Siemens

/**
 * This directive is used to display properties of a widget
 *
 * @module js/wysiwyg-prop.directive
 */

import * as app from 'app';
import 'js/aw-textbox.directive';
import 'js/aw-textarea.directive';
import 'js/aw-checkbox.directive';
import 'js/aw-radiobutton.directive';
import 'js/aw-widget.directive';
import 'js/aw-date.directive';
import 'js/aw-togglebutton.directive';
import 'js/aw-row.directive';
import 'js/aw-column.directive';
import 'js/aw-command-bar.directive';
import 'js/aw-splm-table.directive';
import 'js/aw-command-panel-section.directive';
import 'js/aw-repeat.directive';
import 'js/exist-when.directive';

/**
 * Display example .
 *
 * @example <wysiwyg-prop vmo="child"></wysiwyg-prop>
 * @memberof NgDirectives
 * @member wysiwyg-prop
 */
app.directive( 'wysiwygProp', [ function() {
    return {
        restrict: 'E',
        scope: {
            vmo: '='
        },
        templateUrl: app.getBaseUrlPath() + '/html/wysProp.directive.html'
    };
} ] );
