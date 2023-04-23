// Copyright (c) 2020 Siemens

/**
 * This an Active Workspace specific directive.
 *
 * Directive to display a cell containing a ViewModelObject which represents a Type.
 * The cell will show the Type's icon and its display name.
 *
 * @module js/aw-type-cell.directive
 */
import app from 'app';
import 'js/aw-list.controller';
import 'js/aw-type-icon.directive';

/**
 * This an Active Workspace specific directive.
 *
 * Directive to display a cell containing a ViewModelObject which represents a Type.
 * The cell will show the Type's icon and its display name.
 *
 * @example <aw-type-cell vmo="model"></aw-type-cell>
 *
 * @member aw-type-cell
 * @memberof NgElementDirectives
 */
app.directive( 'awTypeCell', [
    function() {
        return {
            restrict: 'E',
            scope: {
                vmo: '='
            },
            templateUrl: app.getBaseUrlPath() + '/html/aw-type-cell.directive.html'
        };
    }
] );
