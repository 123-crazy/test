// Copyright (c) 2020 Siemens

/**
 * This service handles command definition section to a command sublocation
 *
 * @module js/commandsDefinitionService
 *
 * @namespace commandsDefinitionService
 */
import app from 'app';
import uwPropertyService from 'js/uwPropertyService';
import localeSvc from 'js/localeService';
import appCtxService from 'js/appCtxService';
import graphQLModelSvc from 'js/graphQLModelService';
import _ from 'lodash';

// eslint-disable-next-line valid-jsdoc
/**
 * This service handles command definition section to a command sublocation
 * @member commandsSublocationService
 * @memberof NgService
 */

/**
 * Setup to map labels to local names.
 */
var localeMap = {};

export let loadConfiguration = function() {
    localeSvc.getLocalizedTextFromKey( 'CommandBuilderMessages.base' ).then( result => localeMap.base = result );
    localeSvc.getLocalizedTextFromKey( 'CommandBuilderMessages.baseDesc' ).then( result => localeMap.baseDesc = result );
    localeSvc.getLocalizedTextFromKey( 'CommandBuilderMessages.commandExToolTip' ).then( result => localeMap.extendedTooltip  = result );
    localeSvc.getLocalizedTextFromKey( 'CommandBuilderMessages.group' ).then( result => localeMap.group = result );
    localeSvc.getLocalizedTextFromKey( 'CommandBuilderMessages.groupDesc' ).then( result => localeMap.groupDesc = result );
    localeSvc.getLocalizedTextFromKey( 'CommandBuilderMessages.toggle' ).then( result => localeMap.toggle = result );
    localeSvc.getLocalizedTextFromKey( 'CommandBuilderMessages.toggleDesc' ).then( result => localeMap.toggleDesc = result );
    localeSvc.getLocalizedTextFromKey( 'CommandBuilderMessages.ribbon' ).then( result => localeMap.ribbon = result );
    localeSvc.getLocalizedTextFromKey( 'CommandBuilderMessages.ribbonDesc' ).then( result => localeMap.ribbonDesc = result );
    localeSvc.getLocalizedTextFromKey( 'CommandBuilderMessages.selectedCmdExTooltip' ).then( result => localeMap.selectedExtendedTooltip = result );
    localeSvc.getLocalizedTextFromKey( 'CommandBuilderMessages.shuttle' ).then( result => localeMap.shuttle = result );
    localeSvc.getLocalizedTextFromKey( 'CommandBuilderMessages.shuttleDesc' ).then( result => localeMap.shuttleDesc = result );
    localeSvc.getLocalizedTextFromKey( 'CommandBuilderMessages.iconId' ).then( result => localeMap.iconId = result );
    localeSvc.getLocalizedTextFromKey( 'CommandBuilderMessages.commandId' ).then( result => localeMap.commandId = result );
    localeSvc.getLocalizedTextFromKey( 'CommandBuilderMessages.selectedIconID' ).then( result => localeMap.selectedIcon = result );
    localeSvc.getLocalizedTextFromKey( 'CommandBuilderMessages.commandTitle' ).then( result => localeMap.title = result );
    localeSvc.getLocalizedTextFromKey( 'awAddDirectiveMessages.datasetDesc' ).then( result => localeMap.description  = result );
    localeSvc.getLocalizedTextFromKey( 'CommandBuilderMessages.selectedCommandTitle' ).then( result => localeMap.selectedTitle = result );
    localeSvc.getLocalizedTextFromKey( 'CommandBuilderMessages.selectedCommandDescription' ).then( result => localeMap.selectedDescription = result );
    localeSvc.getLocalizedTextFromKey( 'CommandBuilderMessages.commandType' ).then( result => localeMap.type = result );
};

var exports = {};

/**
 * Set title property values
 *
 * @param {Object} viewModelProp - view model property.
 * @param {Object} titleObj - (Optional) graphQL title object containing value, key and source.
 */
var setTitlePropertyValues = function( viewModelProp, titleObj ) {
    var titleObjIn = titleObj;
    if( !titleObj ) {
        titleObjIn = {
            value: viewModelProp.dbValue,
            titleKey: viewModelProp.titleKey,
            titleSource: viewModelProp.titleSource
        };
    }

    if( _.isEmpty( titleObjIn.value ) || !titleObjIn.titleKey || !titleObjIn.titleSource ) {
        //set create anchor of title
        viewModelProp.anchor = 'aw_i18nAddLocaleAnchor';
        uwPropertyService.setIsEnabled( viewModelProp, true );
    } else {
        //reset modify anchor of title
        viewModelProp.anchor = 'aw_i18nEditRemoveLocaleAnchor';
        uwPropertyService.setIsEnabled( viewModelProp, false );
    }
    viewModelProp.titleKey = titleObjIn.titleKey ? titleObjIn.titleKey : '';
    viewModelProp.titleSource = titleObjIn.titleSource ? titleObjIn.titleSource : '';
};

/**
 * Set selected title property values
 *
 * @param {Object} viewModelProp - view model property.
 * @param {Object} selectedTitleObj - (Optional) graphQL selected title object containing value, key and source.
 */
var setSelectedTitlePropertyValues = function( viewModelProp, selectedTitleObj ) {
    var selectedTitleObjIn = selectedTitleObj;
    if( !selectedTitleObj ) {
        selectedTitleObjIn = {
            value: viewModelProp.dbValue,
            titleKey: viewModelProp.titleKey,
            titleSource: viewModelProp.titleSource
        };
    }

    if( _.isEmpty( selectedTitleObjIn.value ) || !( selectedTitleObjIn.titleKey || selectedTitleObjIn.selectedTKey ) ||
        !( selectedTitleObjIn.titleSource || selectedTitleObjIn.selectedTSource ) ) {
        //set create anchor of selected title
        viewModelProp.anchor = 'aw_cmdSelectedTitleCreateAction';
        uwPropertyService.setIsEnabled( viewModelProp, true );
    } else {
        //reset modify anchor of selected title
        viewModelProp.anchor = 'aw_cmdSelectedTitleEditAction';
        uwPropertyService.setIsEnabled( viewModelProp, false );
    }
    var titleKey = selectedTitleObjIn.titleKey ? selectedTitleObjIn.titleKey : '';
    var titleSource = selectedTitleObjIn.titleSource ? selectedTitleObjIn.titleSource : '';
    viewModelProp.titleKey = selectedTitleObjIn.selectedTKey ? selectedTitleObjIn.selectedTKey : titleKey;
    viewModelProp.titleSource = selectedTitleObjIn.selectedTSource ? selectedTitleObjIn.selectedTSource : titleSource;
};

/**
 * Convert objects and parse them in such a way it shows the data correctly in command definition summary
 *
 * @param {Object} gqlResult - command definition objects from server.
 * @param {DeclViewModel} declViewModelIn - (Optional) A {DeclViewModel} to set into the 'up' pointers on
 * each {ViewModelProperty}.
 *
 * @return {Object} view model properties map
 */
export let convertCommandDefinitionData = function( gqlResult, declViewModelIn ) {
    var gqlCommandDef = _.get( gqlResult, 'data.command' );

    if( gqlCommandDef ) {
        var vmPropsList = graphQLModelSvc.convertGqlPropsToVMProps( gqlCommandDef, localeMap, null, true );
        var vmPropsMap = _.keyBy( vmPropsList, obj => obj.propertyName );

        _.forEach( vmPropsMap, function( value, key ) {
            if( key === 'title' ) {
                setTitlePropertyValues( value );
                value.renderingHint = 'textbox';
            } else if( key === 'description' ) {
                setTitlePropertyValues( value );
                value.renderingHint = 'textbox';
            } else if( key === 'selectedTitle' ) {
                setSelectedTitlePropertyValues( value );
                value.renderingHint = 'textbox';
            } else if( key === 'selectedDescription' ) {
                setSelectedTitlePropertyValues( value );
                value.renderingHint = 'textbox';
            } else if( key === 'selectedIcon' || key === 'icon' ) {
                value.dataProvider = 'iconsDataProvider';
                value.hasLov = true;
                value.propertyLabelDisplay = 'NO_PROPERTY_LABEL';
            } else if( key === 'type' ) {
                value.dataProvider = 'getCommandTypeDP';
                value.renderingHint = 'editLov';
                value.hasLov = true;
            } else if( key === 'extendedTooltip' || key === 'selectedExtendedTooltip' ) {
                value.renderingHint = 'textbox';
            }

            value.getViewModel = function() {
                return declViewModelIn;
            };

            if( appCtxService.ctx && appCtxService.ctx.selected ) {
                appCtxService.ctx.selected.props[ key ] = value;
            }
        } );
    }

    return vmPropsMap;
};

export let updateSelectedObjectProps = function( propName, propValue ) {
    if( propName && propValue ) {
        var selectedVMO = appCtxService.ctx.selected;
        if( selectedVMO.props && selectedVMO.props[ propName ] ) {
            var dbValue = propValue;
            var uiValue = dbValue.toString();

            if( _.isObject( propValue ) ) {
                if( _.isEmpty( propValue ) ) {
                    dbValue = selectedVMO.props[ propName ].dbValue;
                } else {
                    dbValue = propValue.value;
                }
                uiValue = dbValue.toString();

                if( propName === 'title' ) {
                    selectedVMO.cellHeader1 = uiValue;
                    selectedVMO.cellProperties = [ {
                        key: localeMap.commandId,
                        value: selectedVMO.uid
                    } ];

                    selectedVMO.displayName = selectedVMO.cellHeader1;

                    setTitlePropertyValues( selectedVMO.props[ propName ], propValue );
                } else if( propName === 'description' ) {
                    setTitlePropertyValues( selectedVMO.props[ propName ], propValue );
                } else if( propName === 'selectedTitle' || propName === 'selectedDescription' ) {
                    setSelectedTitlePropertyValues( selectedVMO.props[ propName ], propValue );
                }
            }

            selectedVMO.props[ propName ].displayValues = [ uiValue ];
            selectedVMO.props[ propName ].uiValue = uwPropertyService.getUiValue( [ uiValue ] );
            selectedVMO.props[ propName ].value = dbValue;
            if( selectedVMO.props[ propName ].prevDisplayValues ) {
                selectedVMO.props[ propName ].prevDisplayValues = selectedVMO.props[ propName ].displayValues;
            }
            selectedVMO.props[ propName ].dbValue = _.cloneDeep( dbValue );
        }
    }
};

/**
 * Convert objects and parse them in such a way it shows the data correctly in LOVs
 *
 * @param {Object} gqlResult - array of gqlResult objects.
 *
 * @return {Array} Parsed lov entries array
 */
export let convertTitleI18NsToLovEntries = function( gqlResult ) {
    var gqlItems = _.get( gqlResult, 'data.i18ns' );

    return graphQLModelSvc.convertTitleI18NsToLovEntries( gqlItems );
};

/**
 * Convert objects and parse them in such a way it shows the data correctly in LOVs
 *
 * @param {Object} gqlResult - array of gqlResult objects.
 *
 * @return {Array} Parsed lov entries array
 */
export let convertCommandTypesToLovEntries = function( gqlResult ) {
    let reformattedTypes = [];
    let gqlcmdTypes = _.get( gqlResult, 'data.commandTypes' );
    if( gqlcmdTypes ) {
        reformattedTypes = gqlcmdTypes.map( value => {
            let typeObj = {};
            if( _.isString( value ) ) {
                let lowcaseValue = value.toLowerCase();
                typeObj.propInternalValue = localeMap[ lowcaseValue ] ? localeMap[ lowcaseValue ] : '';
                typeObj.propDisplayValue = localeMap[ lowcaseValue ] ? localeMap[ lowcaseValue ] : '';
                typeObj.propDisplayDescription = localeMap[ lowcaseValue + 'Desc' ] ? localeMap[ lowcaseValue + 'Desc' ] : '';
                return typeObj;
            }
        } );
    }
    return reformattedTypes;
};

exports = {
    loadConfiguration,
    convertCommandDefinitionData,
    updateSelectedObjectProps,
    convertTitleI18NsToLovEntries,
    convertCommandTypesToLovEntries
};
export default exports;

loadConfiguration();

app.factory( 'commandsDefinitionService', () => exports );
