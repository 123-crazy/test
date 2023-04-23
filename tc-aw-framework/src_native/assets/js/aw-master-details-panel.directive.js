// Copyright (c) 2020 Siemens

/**
 * Directive to support standard layout implementation
 *
 * @module js/aw-master-details-panel.directive
 * @deprecated afx@4.1.0.
 * @alternative sync strategy could be used to achieve the same.
 * @obsoleteIn afx@5.0.0
 */
import app from 'app';
import 'lodash';
import 'angular';
import 'jquery';
import 'js/aw-column.directive';
import 'js/aw-splitter.directive';
import 'js/aw.master.details.panel.controller';
import 'js/aw-include.directive';

app.directive( 'awMasterDetailsPanel', [ function() {
    return {
        restrict: 'E',
        scope: {
            master: '@',
            detailsPanel: '@'
        },
        templateUrl: app.getBaseUrlPath() + '/html/aw-master-details-panel.directive.html',
        controller: 'awMasterDetailsPanelController'
    };
} ] );
