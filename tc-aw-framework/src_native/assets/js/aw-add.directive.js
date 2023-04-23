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
 * Directive to display Add panel
 *
 * @module js/aw-add.directive
 */
import * as app from 'app';
import 'js/aw-add.controller';
import 'js/aw-command-panel.directive';
import 'js/aw-command-sub-panel.directive';

/**
 * Directive to display Add panel. It shows 3 tab pages by default: New, Palette and Search. User can specify
 * visible-tabs to control the visible tabs.
 *
 * This directive can further be configured by using optional attributes as follows:
 *
 * 1. targetObject: The target object to add the new created object to.
 *
 * 2. relations: A list of comma-separated relations that are applicable for the newly created object and target
 * object. A list box will show on footer area when there are more than one relations.
 *
 * 3. include-types: A list of comma-separated root types. This list will override the list in preference
 * AWC_TypeSelectorInclusionTypeList. However, the resulting list will exclude the types specified in preference
 * AWC_TypeSelectorExclusionTypeList.
 *
 * 4. load-sub-types: This boolean attribute specifies whether the sub types of include Types should be loaded or
 * not. If the attribute is not provided, sub types will be loaded by default.
 *
 * 5. type-override-id: This attribute can specify an identifier to override the default preferences. The data
 * provider will then look up two preferences, namely AWC_[override-id]_TypeSelectorInclusionTypeList and
 * AWC_[override-id]_TypeSelectorExclusionTypeList, for the list of root types and excluded types, respectively.
 *
 * 6. auto-select-on-unique-type: This boolean attribute is used to specify whether to auto select type if there is
 * only one type in the list. If the attribute is not provided, auto selection won't happen.
 *
 * 7. visible-tabs: the list of visible tab keys joined by comma ','. Supported tab key are: new, palette, search.
 *
 * 8. max-recent-count: the max count of recent used type list to show. If not specified, it will read preference
 * "Create_WorkspaceObject_mru_max".
 *
 * 9. type-filter: shows the filter parent type of the items in the clipboard, favorite, history section
 *
 * 10. selection-mode : optional, default is multiselect, This is only applicable for Palette and Search tabs, to
 * constrain selection in all model object lists to single or multiple selection
 *
 * 11. preferred-type : optional, if provided loads the related xrt directly instead of showing Types panel
 *
 * 12. search-filter: optional, the filters to prefilter the search results.
 *
 * 13. is-include-sub-types: optional, If true, it will check the sourceObject's typeHierarchy with given filterTypes.
 *
 * 14. relationMap: optional, map of type name to valid realtions. If not set will be generated from included types and relation list
 *
 * @example <aw-add target-object="targetObject" relations="contents,Iman_Rendering" include-types="Item,Folder"
 *          visible-tabs="new,palette" max-recent-count="5"></aw-add>
 * @example <aw-add target-object="targetObject" relations="contents,Iman_Rendering" type-override-id="CreateReport"
 *          visible-tabs="new"></aw-add>
 * @example <aw-add target-object="targetObject" relations="contents"></aw-add>
 * @example <aw-add target-object="targetObject" relations="contents" type-filter="Folder,Item"></aw-add>
 * @example <aw-add target-object="targetObject" selection-mode="single" preferred-type="Item"></aw-add>
 * @example <aw-add target-object="targetObject" relations="contents" type-filter="Folder,Item"
 *          search-filter="POM_application_object.owning_user=someone"></aw-add>
 * @example <aw-add target-object="targetObject" relations="contents" type-filter="Folder,Item"
 *          search-filter="POM_application_object.owning_user=someone"
 *          is-include-sub-types="data.isIncludeSubTypes"></aw-add>
 * @member aw-add
 * @memberof NgElementDirectives
 */
app.directive( 'awAdd', [ function() {
    return {
        restrict: 'E',
        controller: 'awAddController',
        transclude: true,
        scope: {
            relationMap: '=?',
            targetObject: '=?', // optional
            relations: '@?', // optional
            includeTypes: '@?', // optional
            loadSubTypes: '=?', // optional, boolean
            typeOverrideId: '@?', // optional
            autoSelectOnUniqueType: '=?', // optional, boolean
            visibleTabs: '@?', // optional
            maxRecentCount: '@?', // optional
            typeFilter: '@?', // optional
            selectionMode: '@?', // optional, string
            preferredType: '@?', // optional, string
            searchFilter: '@?', // optional
            isIncludeSubTypes: '=?' // optional, boolean
        },
        templateUrl: app.getBaseUrlPath() + '/html/aw-add.directive.html'
    };
} ] );
