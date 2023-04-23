// @<COPYRIGHT>@
// ==================================================
// Copyright 2019.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/**
 * @module js/taskbar-header.directive
 */
import app from 'app';
import 'js/aw-flex-row.directive';
import 'js/aw-flex-column.directive';
import 'js/exist-when.directive';

/**
 *
 * @memberof NgDirectives
 */
+

app.directive( 'taskbarHeader', [ function() {
    return {
        restrict: 'E',
        scope: {
            taskName: '=?',
            subtaskName: '=?',
            contextObject:'=?'
        },
        templateUrl: app.getBaseUrlPath() + '/html/taskbar-header.directive.html'
    };
} ] );
