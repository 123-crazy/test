// @<COPYRIGHT>@
// ==================================================
// Copyright 2018.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/aw-chart-search-view.directive
 */
import app from 'app';
import 'jquery';
import 'js/eventBus';
import 'js/aw-i18n.directive';
import 'js/viewModelService';
import 'js/appCtxService';
import 'js/aw-column-chart.directive';
import 'js/aw-listbox.directive';
import 'js/aw-search-visualnavigationcontent.directive';

'use strict';
/*eslint-disable-next-line valid-jsdoc*/
/**
 * Directive to show Chart and selectors
 *
 * @example <aw-chart-search-view></aw-chart-search-view>
 *
 */
app.directive( 'awChartSearchView', [
    function() {
        return {
            templateUrl: app.getBaseUrlPath() + '/html/aw-chart-search-view.directive.html'
        };
    }
] );
