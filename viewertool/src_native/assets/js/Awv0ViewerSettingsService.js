// @<COPYRIGHT>@
// ==================================================
// Copyright 2015.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/Awv0ViewerSettingsService
 */
import * as app from 'app';
import viewerCtxSvc from 'js/viewerContext.service';
import appCtxSvc from 'js/appCtxService';
import viewerPreferenceService from 'js/viewerPreference.service';
import AwTimeoutService from 'js/awTimeoutService';
import AwPromiseService from 'js/awPromiseService';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import messagingService from 'js/messagingService';
import localeSvc from 'js/localeService';
import listBoxService from 'js/listBoxService';

var _viewerSettingsToolAndInfoPanelCloseEventSubscription = null;
var _viewerPMIEvent = null;

var exports = {};

var Units = {
    MILLIMETERS: 1,
    CENTIMETERS: 2,
    METERS: 3,
    INCHES: 4,
    FEET: 5,
    YARDS: 6,
    MICROMETERS: 7,
    DECIMETERS: 8,
    KILOMETERS: 9,
    MILS: 10
};
/**
 * offset delta value to be used for calculating floor offset
 */
var m_offsetDelta = 0.5;

var materialData = [ { iconName: '01ShinyMetal', tooltip: getLocalizedText( 'materialTooltip1' ) },
    { iconName: '02BrushedMetal', tooltip: getLocalizedText( 'materialTooltip2' ) },
    { iconName: '03ShinyPlastic', tooltip: getLocalizedText( 'materialTooltip3' ) },
    { iconName: '04Analysis', tooltip: getLocalizedText( 'materialTooltip4' ) },
    { iconName: '05Flat', tooltip: getLocalizedText( 'materialTooltip5' ) },
    { iconName: '06RedGlossyPlastic', tooltip: getLocalizedText( 'materialTooltip6' ) },
    { iconName: '07BlueGlossyPlastic', tooltip: getLocalizedText( 'materialTooltip7' ) },
    { iconName: '08GreenGlossyPlastic', tooltip: getLocalizedText( 'materialTooltip8' ) },
    { iconName: '09GrayGlossyPlastic', tooltip: getLocalizedText( 'materialTooltip9' ) },
    { iconName: '10BlackGlossyPlastic', tooltip: getLocalizedText( 'materialTooltip10' ) },
    { iconName: '11BrownGlossyPlastic', tooltip: getLocalizedText( 'materialTooltip11' ) },
    { iconName: '12YellowGlossyPlastic', tooltip: getLocalizedText( 'materialTooltip12' ) },
    { iconName: '13TealGlossyPlastic', tooltip: getLocalizedText( 'materialTooltip13' ) },
    { iconName: '14WhiteGlossyPlastic', tooltip: getLocalizedText( 'materialTooltip14' ) },
    { iconName: '15ClearPlastic', tooltip: getLocalizedText( 'materialTooltip15' ) },
    { iconName: '16Chrome', tooltip: getLocalizedText( 'materialTooltip16' ) },
    { iconName: '17Copper', tooltip: getLocalizedText( 'materialTooltip17' ) },
    { iconName: '18Gold', tooltip: getLocalizedText( 'materialTooltip18' ) },
    { iconName: '19Brass', tooltip: getLocalizedText( 'materialTooltip19' ) },
    { iconName: '20Steel', tooltip: getLocalizedText( 'materialTooltip20' ) },
    { iconName: '21BrushedChrome', tooltip: getLocalizedText( 'materialTooltip21' ) },
    { iconName: '22BrushedAluminum', tooltip: getLocalizedText( 'materialTooltip22' ) },
    { iconName: '23Titanium', tooltip: getLocalizedText( 'materialTooltip23' ) },
    { iconName: '24Glass', tooltip: getLocalizedText( 'materialTooltip24' ) },
    { iconName: '25SmokeyGlass', tooltip: getLocalizedText( 'materialTooltip25' ) },
    { iconName: '26RedPaint', tooltip: getLocalizedText( 'materialTooltip26' ) },
    { iconName: '27GrayPaint', tooltip: getLocalizedText( 'materialTooltip27' ) },
    { iconName: '28BlackPaint', tooltip: getLocalizedText( 'materialTooltip28' ) },
    { iconName: '29BluePaint', tooltip: getLocalizedText( 'materialTooltip29' ) },
    { iconName: '30Rubber', tooltip: getLocalizedText( 'materialTooltip30' ) }
];

/**
 * Viewer settings panel revealed
 *
 * @function viewerSettingsPanelRevealed
 *
 * @param {Object} shadedCheckboxProp shaded property
 * @param {Object} walkCheckboxProp walk property
 * @param {Object} useIndexedCheckboxProp useIndexed property
 * @param {Object} modelTitleProp modelTitle property
 * @param {Object} unitTextProp unitText property
 * @param {Object} localeTextBundle localized text
 * @param {Object} renderSourceServerCheckboxProp renderSourceServerCheckboxProp property
 * @param {Object} renderSourceClientCheckboxProp renderSourceClientCheckboxProp property
 *
 */
export let viewerSettingsPanelRevealed = function( shadedCheckboxProp, walkCheckboxProp, useIndexedCheckboxProp, modelTitleProp, unitTextProp, localeTextBundle, renderSourceServerCheckboxProp,
    renderSourceClientCheckboxProp, modelName, materialProp ) {

    let viewerCurrCtx = viewerCtxSvc.getRegisteredViewerContext( appCtxSvc.ctx.viewer.activeViewerCommandCtx );
    if( !viewerCurrCtx.isMMVRendering() ) {
        shadedCheckboxProp.isVisible = true;
        shadedCheckboxProp.dbValue = viewerPreferenceService.getShadedWithEdgesPreference();
    }

    var promise = viewerCtxSvc.getPMISettings( appCtxSvc.ctx.viewer.activeViewerCommandCtx );
    promise.then( function( returnObject ) {
        var hasPMI = returnObject.hasPMIData;
        if( hasPMI ) {
            viewerCtxSvc.getInPlane( appCtxSvc.ctx.viewer.activeViewerCommandCtx ).then( function( inPlane ) {
                appCtxSvc.updatePartialCtx( 'viewer.preference.pmiChecked', inPlane );
                if( !inPlane ) {
                    eventBus.publish( 'viewerSettings.showPMIFlatToScreenTrue', {} );
                    exports.setPMIFaltToScreen( true );
                } else {
                    eventBus.publish( 'viewerSettings.showPMIFlatToScreenFalse', {} );
                }
            } );
        }
    } );
    _subscribeForViewerSettingsPanelCloseEvent();
    walkCheckboxProp.isVisible = navigator.userAgent.indexOf( 'iPad' ) < 0; // not supported on ipad
    let hasAlternatePCI = viewerCtxSvc.getViewerApplicationContext( appCtxSvc.ctx.viewer.activeViewerCommandCtx,
        viewerCtxSvc.VIEWER_HAS_ALTERNATE_PCI_TOKEN );
    if( hasAlternatePCI ) {
        useIndexedCheckboxProp.isVisible = true;
        let alternatePCI = viewerPreferenceService.getUseAlternatePCIPreference();
        if( alternatePCI === 'INDEXED' ) {
            useIndexedCheckboxProp.dbValue = true;
        } else {
            useIndexedCheckboxProp.dbValue = false;
        }
    } else {
        useIndexedCheckboxProp.isVisible = false;
    }
    var modelUnit = viewerPreferenceService.getModelUnit();
    var displayUnit = viewerPreferenceService.getDisplayUnit();
    for( var key in Units ) {
        if( Units[ key ] === modelUnit ) {
            modelTitleProp.uiValue = localeTextBundle[ key.toLowerCase() ];
        }
        if( Units[ key ] === displayUnit ) {
            unitTextProp.propertyDisplayName = localeTextBundle[ key.toLowerCase() ];
        }
    }
    var renderSource = viewerPreferenceService.getRenderSource();
    if( renderSource[ 0 ] === 'SSR' ) {
        renderSourceServerCheckboxProp.dbValue = true;
        renderSourceClientCheckboxProp.dbValue = false;
    } else if( renderSource[ 0 ] === 'CSR' ) {
        renderSourceServerCheckboxProp.dbValue = false;
        renderSourceClientCheckboxProp.dbValue = true;
    }
    var viewerCurrProdCtx = viewerCtxSvc.getViewerApplicationContext( appCtxSvc.ctx.viewer.activeViewerCommandCtx,
        viewerCtxSvc.VIEWER_CURRENT_PRODUCT_CONTEXT_TOKEN );
    var currentProductProperties = viewerCurrProdCtx.props;
    modelName.propertyDisplayName = currentProductProperties.object_name !== undefined ? currentProductProperties.object_name.dbValues[ 0 ] : currentProductProperties.object_string.dbValues[ 0 ];

    materialProp.dbValue[ 0 ].iconName = materialData[ parseInt( materialProp.dbValue[ 0 ].materialIndex ) ].iconName;
    materialProp.dbValue[ 0 ].tooltip = materialData[ parseInt( materialProp.dbValue[ 0 ].materialIndex ) ].tooltip;
    materialProp.propertyDisplayName = materialData[ parseInt( materialProp.dbValue[ 0 ].materialIndex ) ].tooltip;
    materialProp.dbValue[ 0 ].iconUrl = app.getBaseUrlPath() + '/image/cmd' + materialData[ parseInt( materialProp.dbValue[ 0 ].materialIndex ) ].iconName + '24.svg';

    return {
        shadedCheckboxProp: shadedCheckboxProp,
        walkCheckboxProp: walkCheckboxProp,
        useIndexedCheckboxProp: useIndexedCheckboxProp,
        modelTitleProp: modelTitleProp,
        unitTextProp: unitTextProp,
        renderSourceServerCheckboxProp: renderSourceServerCheckboxProp,
        renderSourceClientCheckboxProp: renderSourceClientCheckboxProp,
        modelName: modelName,
        materialProp: materialProp,
        handleMaterialIconClick: this.handleMaterialIconClick
    };
};

/**
 *
 * @function viewerSettingsPanelRevealThemeProp
 *
 * @param {Object} data viewer settings data
 */
export let viewerSettingsPanelRevealThemeProp = function( data ) {
    let deferred = AwPromiseService.instance.defer();
    let viewerContext = appCtxSvc.getCtx( 'viewer.activeViewerCommandCtx' );
    viewerCtxSvc.getBackgroundColorThemes( viewerContext ).then( function( themesList ) {

        let internalValues = [];
        let values = [];
        let themeToDisplay;
        let themeIndexDisplay;
        let colorThemeToDisplay;
        let colorThemeToDisplayIndex;
        let colorTheme = viewerPreferenceService.getColorTheme();
        for( let i = 0; i < themesList.length; i++ ) {
            let themeCurrentObject = JSON.parse( themesList[ i ] );
            themeToDisplay = themeCurrentObject[ "Name" ];
            themeIndexDisplay = themeCurrentObject[ "Index" ];
            if( themeToDisplay === 'From Session' && colorTheme[ 0 ] === themeIndexDisplay ) {
                themeToDisplay = getLocalizedText( 'fromSession' );
                colorThemeToDisplay = getLocalizedText( 'fromSession' );
                colorThemeToDisplayIndex = themeIndexDisplay;
            } else if( colorTheme[ 0 ] === themeIndexDisplay ) {
                colorThemeToDisplay = themeToDisplay;
                colorThemeToDisplayIndex = themeIndexDisplay;
            }
            internalValues[ i ] = themeIndexDisplay;
            values[ i ] = themeToDisplay;
        }

        let themeProp = data.themeProp;
        let editData = {};
        themeProp.dbValue = colorThemeToDisplayIndex;
        themeProp.dispValue = colorThemeToDisplay;
        themeProp.uiValue = colorThemeToDisplay;

        let colorThemeList = listBoxService.createListModelObjectsFromStrings( values );
        for( let j = 0; j < internalValues.length; j++ ) {
            colorThemeList[ j ].propInternalValue = internalValues[ j ];
            colorThemeList[ j ].propDisplayValue = values[ j ];
        }
        editData = {
            themeProp: themeProp,
            colorThemeList: colorThemeList
        };
        deferred.resolve( editData );
    }, function( reason ) {
        deferred.reject( 'viewerRender: Failed to get list of Themes:' + reason );
    } );

    return deferred.promise;
};

/**
 * Handle material icon click
 *
 * @function handleMaterialIconClick
 */
export let handleMaterialIconClick = function() {
    eventBus.publish( 'materialWidget.showMaterialPopup' );
};

/**
 * Set shaded mode in viewer
 *
 * @function shadedWithEdgesSettingChanged
 *
 * @param {boolean} isChecked - true if checked
 */
export let shadedWithEdgesSettingChanged = function( isChecked ) {
    viewerCtxSvc.setShadedMode( appCtxSvc.ctx.viewer.activeViewerCommandCtx, isChecked ? 1 : 0 );
};

/**
 * Apply true shading material in viewer
 *
 * @function materialSettingChanged
 *
 * @param {boolean} isChecked - true if checked
 */
export let materialSettingChanged = function( isChecked ) {
    viewerCtxSvc.applyTrueShadingMaterials( appCtxSvc.ctx.viewer.activeViewerCommandCtx, isChecked );
};

/**
 * Set trihedron setting for viewer
 *
 * @function trihedronSettingChanged
 *
 * @param {boolean} isChecked - true if checked
 */
export let trihedronSettingChanged = function( isChecked ) {
    viewerCtxSvc.setTrihedron( appCtxSvc.ctx.viewer.activeViewerCommandCtx, isChecked );
};

/**
 * Revert render setting to SSR
 *
 * @function revertRenderSettingToSSR
 *
 * @param {Object} renderSourceServerCheckboxProp - render Source server property
 * @param {Object} renderSourceClientCheckboxProp - render Source client property
 *
 * @returns {Object} render Source property
 */
export let revertRenderSettingToSSR = function( renderSourceServerCheckboxProp, renderSourceClientCheckboxProp ) {
    renderSourceServerCheckboxProp.dbValue = true;
    renderSourceClientCheckboxProp.dbValue = false;
    return {
        renderSourceServerCheckboxProp: renderSourceServerCheckboxProp,
        renderSourceClientCheckboxProp: renderSourceClientCheckboxProp
    };
};

/**
 * Revert render setting to CSR
 *
 * @function revertRenderSettingToCSR
 *
 * @param {Object} renderSourceServerCheckboxProp - render Source server property
 * @param {Object} renderSourceClientCheckboxProp - render Source client property
 *
 * @returns {Object} render Source property
 */
export let revertRenderSettingToCSR = function( renderSourceServerCheckboxProp, renderSourceClientCheckboxProp ) {
    renderSourceServerCheckboxProp.dbValue = false;
    renderSourceClientCheckboxProp.dbValue = true;
    return {
        renderSourceServerCheckboxProp: renderSourceServerCheckboxProp,
        renderSourceClientCheckboxProp: renderSourceClientCheckboxProp
    };
};

/**
 * Reset render source option on user cancellation
 *
 * @function renderSourceChangeCancelled
 *
 * @param {Object} renderSourceServerCheckboxProp - render Source server property
 * @param {Object} renderSourceClientCheckboxProp - render Source client property
 * @param {Object} modifiedRenderOption - modified render option
 *
 * @returns {Object} render Source property
 */
export let renderSourceChangeCancelled = function( renderSourceServerCheckboxProp, renderSourceClientCheckboxProp, modifiedRenderOption ) {
    if( modifiedRenderOption === 'Client' ) {
        if( renderSourceClientCheckboxProp.dbValue ) {
            renderSourceClientCheckboxProp.dbValue = false;
        } else {
            renderSourceClientCheckboxProp.dbValue = true;
        }
    } else if( modifiedRenderOption === 'Server' ) {
        if( renderSourceServerCheckboxProp.dbValue ) {
            renderSourceServerCheckboxProp.dbValue = false;
        } else {
            renderSourceServerCheckboxProp.dbValue = true;
        }
    }
    return {
        renderSourceServerCheckboxProp: renderSourceServerCheckboxProp,
        renderSourceClientCheckboxProp: renderSourceClientCheckboxProp
    };
};

/**
 * changing the render source on user confirmation
 *
 * @function renderSourceChangeSuccess
 *
 * @param {Object} renderSourceServerCheckboxProp - render Source server property
 * @param {Object} renderSourceClientCheckboxProp - render Source client property
 * @param {Object} modifiedRenderOption - modified render option
 *
 * @returns {Object} render Source property
 */
export let renderSourceChangeSuccess = function( renderSourceServerCheckboxProp, renderSourceClientCheckboxProp, modifiedRenderOption ) {
    if( modifiedRenderOption === 'Client' ) {
        if( renderSourceServerCheckboxProp.dbValue ) {
            renderSourceServerCheckboxProp.dbValue = false;
        } else {
            renderSourceServerCheckboxProp.dbValue = true;
        }
    } else if( modifiedRenderOption === 'Server' ) {
        if( renderSourceClientCheckboxProp.dbValue ) {
            renderSourceClientCheckboxProp.dbValue = false;
        } else {
            renderSourceClientCheckboxProp.dbValue = true;
        }
    }
    if( renderSourceServerCheckboxProp.dbValue === true ) {
        viewerPreferenceService.setRenderSource( 'SSR' );
    } else if( renderSourceClientCheckboxProp.dbValue === true ) {
        viewerPreferenceService.setRenderSource( 'CSR' );
    }
    eventBus.publish( 'viewerSettings.renderSourceChanged' );
    return {
        renderSourceServerCheckboxProp: renderSourceServerCheckboxProp,
        renderSourceClientCheckboxProp: renderSourceClientCheckboxProp
    };
};

/**
 * set render source as server in UI
 *
 * @function renderSourceChangedServer
 *
 * @param {Object} renderSourceServerCheckboxProp - renderSourceServerCheckboxProp property
 * @param {Boolean} isUserRenderOptionSettingInProgress - is user action in progress
 */
export let renderSourceChangedServer = function( renderSourceServerCheckboxProp, isUserRenderOptionSettingInProgress ) {
    let modifiedRenderOption = null;
    let renderOptionEvent = null;
    if( !isUserRenderOptionSettingInProgress ) {
        let viewerCurrCtx = viewerCtxSvc.getRegisteredViewerContext( appCtxSvc.ctx.viewer.activeViewerCommandCtx );
        if( renderSourceServerCheckboxProp.dbValue ) {
            if( !viewerCurrCtx.isServerSideRenderPossible() ) {
                messagingService.showInfo( viewerCurrCtx.getThreeDViewerMsg( 'ssrNotSupported' ) );
                renderOptionEvent = 'RevertToCSR';
            } else {
                modifiedRenderOption = 'Server';
                renderOptionEvent = 'Server';
            }
        } else {
            if( viewerCurrCtx.isMMVRendering() ) {
                messagingService.showInfo( viewerCurrCtx.getThreeDViewerMsg( 'mmvDataNotViewable' ) );
                renderOptionEvent = 'RevertToSSR';
            } else {
                modifiedRenderOption = 'Server';
                renderOptionEvent = 'Client';
            }
        }
    }
    return {
        isUserRenderOptionSettingInProgress: !isUserRenderOptionSettingInProgress,
        modifiedRenderOption: modifiedRenderOption,
        renderOptionEvent: renderOptionEvent
    };
};

/**
 * set render source as client in UI
 *
 * @function renderSourceChangedClient
 *
 * @param {Object} renderSourceServerCheckboxProp - renderSourceServerCheckboxProp property
 * @param {Boolean} isUserRenderOptionSettingInProgress - is user action in progress
 */
export let renderSourceChangedClient = function( renderSourceClientCheckboxProp, isUserRenderOptionSettingInProgress ) {
    let modifiedRenderOption = null;
    let renderOptionEvent = null;
    if( !isUserRenderOptionSettingInProgress ) {
        let viewerCurrCtx = viewerCtxSvc.getRegisteredViewerContext( appCtxSvc.ctx.viewer.activeViewerCommandCtx );
        if( renderSourceClientCheckboxProp.dbValue ) {
            if( viewerCurrCtx.isMMVRendering() ) {
                messagingService.showInfo( viewerCurrCtx.getThreeDViewerMsg( 'mmvDataNotViewable' ) );
                renderOptionEvent = 'RevertToSSR';
            } else {
                modifiedRenderOption = 'Client';
                renderOptionEvent = 'Client';
            }
        } else {
            if( !viewerCurrCtx.isServerSideRenderPossible() ) {
                messagingService.showInfo( viewerCurrCtx.getThreeDViewerMsg( 'ssrNotSupported' ) );
                renderOptionEvent = 'RevertToCSR';
            } else {
                modifiedRenderOption = 'Client';
                renderOptionEvent = 'Server';
            }
        }
    }
    return {
        isUserRenderOptionSettingInProgress: !isUserRenderOptionSettingInProgress,
        modifiedRenderOption: modifiedRenderOption,
        renderOptionEvent: renderOptionEvent
    };
};

/**
 * Set floor setting for viewer
 *
 * @function showFloorSettingChanged
 *
 * @param {boolean} isChecked - true if checked
 */
export let showFloorSettingChanged = function( isChecked ) {
    viewerCtxSvc.setFloorVisibility( appCtxSvc.ctx.viewer.activeViewerCommandCtx, isChecked );
};

/**
 * Set grid setting for viewer
 *
 * @function gridSettingChanged
 *
 * @param {boolean} isChecked - true if checked
 */
export let gridSettingChanged = function( isChecked ) {
    viewerCtxSvc.setGridVisibility( appCtxSvc.ctx.viewer.activeViewerCommandCtx, isChecked );
};

/**
 * Set shadow setting for viewer
 *
 * @function shadowSettingChanged
 *
 * @param {boolean} isChecked - true if checked
 */
export let shadowSettingChanged = function( isChecked ) {
    viewerCtxSvc.setShadowVisibility( appCtxSvc.ctx.viewer.activeViewerCommandCtx, isChecked );
};

/**
 * Set reflection setting for viewer
 *
 * @function reflectionSettingChanged
 *
 *
 * @param {boolean} isChecked - true if checked
 */
export let reflectionSettingChanged = function( isChecked ) {
    viewerCtxSvc.setReflectionVisibility( appCtxSvc.ctx.viewer.activeViewerCommandCtx, isChecked );
};

/**
 * Set navigation 3D mode for viewer
 *
 * @function examineSettingChanged
 *
 * @param {boolean} isChecked - true if checked
 * @param {Object} walkCheckboxProp - walk property
 */
export let examineSettingChanged = function( isChecked, walkCheckboxProp ) {
    if( isChecked ) {
        viewerCtxSvc.setNavigation3Dmode( appCtxSvc.ctx.viewer.activeViewerCommandCtx, 'EXAMINE' );
        walkCheckboxProp.dbValue = false;
    } else {
        viewerCtxSvc.setNavigation3Dmode( appCtxSvc.ctx.viewer.activeViewerCommandCtx, 'WALK' );
        walkCheckboxProp.dbValue = true;
    }
    return {
        walkCheckboxProp: walkCheckboxProp
    };
};

/**
 * Set navigation 3D mode for viewer
 *
 * @function walkSettingChanged
 *
 * @param {boolean} isChecked - true if checked
 * @param {Object} examineCheckboxProp - examine property
 */
export let walkSettingChanged = function( isChecked, examineCheckboxProp ) {
    if( isChecked ) {
        viewerCtxSvc.setNavigation3Dmode( appCtxSvc.ctx.viewer.activeViewerCommandCtx, 'WALK' );
        examineCheckboxProp.dbValue = false;
    } else {
        viewerCtxSvc.setNavigation3Dmode( appCtxSvc.ctx.viewer.activeViewerCommandCtx, 'EXAMINE' );
        examineCheckboxProp.dbValue = true;
    }
    return {
        examineCheckboxProp: examineCheckboxProp
    };
};

/**
 * Update Material widget
 */
export let updateMaterialWidget = function( eventData, materialProp ) {
    if( eventData.index === null ) {
        return materialProp;
    }
    if( eventData.index !== materialProp.dbValue[ 0 ].materialIndex ) {
        materialProp.dbValue[ 0 ].iconName = materialData[ parseInt( eventData.index ) ].iconName;
        materialProp.dbValue[ 0 ].iconUrl = app.getBaseUrlPath() + '/image/cmd' + materialData[ parseInt( eventData.index ) ].iconName + '24.svg';
        materialProp.dbValue[ 0 ].tooltip = materialData[ parseInt( eventData.index ) ].tooltip;
        materialProp.propertyDisplayName = materialData[ parseInt( eventData.index ) ].tooltip;
        materialProp.dbValue[ 0 ].materialIndex = eventData.index;
        viewerCtxSvc.setGlobalMaterial( appCtxSvc.ctx.viewer.activeViewerCommandCtx, eventData.index );
        return { "materialProp": materialProp };
    }
};

/**
 * Handle slider change event
 *
 * @function handleSliderChangeEvent
 *
 * @param {Number} sliderValue - new slider value
 * @param {Object} floorSliderProp - slider property
 */
export let handleSliderChangeEvent = function( sliderValue, floorSliderProp ) {
    var currentOffset = parseFloat( appCtxSvc.getCtx( 'viewer.preference.AWC_visFloorOffset' ) );
    var newOffsetValue = null;
    if( sliderValue > 50 ) {
        newOffsetValue = currentOffset + m_offsetDelta;
    } else if( sliderValue < 50 ) {
        newOffsetValue = currentOffset - m_offsetDelta;
    }
    if( newOffsetValue !== null ) {
        viewerCtxSvc.setFloorOffset( appCtxSvc.ctx.viewer.activeViewerCommandCtx, newOffsetValue );
        if( floorSliderProp !== null ) {
            AwTimeoutService.instance( function() {
                floorSliderProp.dbValue[ 0 ].sliderOption.value = 50;
            }, 0 );
        }
    }

    return floorSliderProp;
};

/**
 * Handle floor plane change event
 *
 * @function viewerFloorPlaneChanged
 *
 * @param {String} planeId - new viewer plane id
 */
export let viewerFloorPlaneChanged = function( planeId ) {
    viewerCtxSvc.setFloorOrientation( appCtxSvc.ctx.viewer.activeViewerCommandCtx, planeId );
};

/**
 * Set selection display highlight
 *
 * @param {Object} useTransparencyCheckboxProp
 */
export let updateSelectionDisplayHighlight = function( useTransparencyCheckboxProp ) {
    if( !useTransparencyCheckboxProp ) {
        return useTransparencyCheckboxProp;
    }
    useTransparencyCheckboxProp.dbValue = false;
    return useTransparencyCheckboxProp;
};

/**
 * Set pmi flat to screen visibility to false
 *
 * @param {Object} pmiCheckboxProp
 */
export let updateShowPMIFlatToScreenFalse = function( pmiCheckboxProp ) {
    if( !pmiCheckboxProp ) {
        return pmiCheckboxProp;
    }
    pmiCheckboxProp.isVisible = true;
    pmiCheckboxProp.dbValue = false;

    return pmiCheckboxProp;
};

/**
 * Set pmi flat to screen visibility to true
 *
 * @param {Object} pmiCheckboxProp
 */
export let updateShowPMIFlatToScreenTrue = function( pmiCheckboxProp ) {
    if( !pmiCheckboxProp ) {
        return pmiCheckboxProp;
    }
    pmiCheckboxProp.isVisible = true;
    pmiCheckboxProp.dbValue = true;

    return pmiCheckboxProp;
};

/**
 * Set selection display transparent
 *
 * @param {Object} useTransparencyCheckboxProp
 */
export let updateSelectionDisplayTransparent = function( useTransparencyCheckboxProp ) {
    if( !useTransparencyCheckboxProp ) {
        return useTransparencyCheckboxProp;
    }
    useTransparencyCheckboxProp.dbValue = true;

    return useTransparencyCheckboxProp;
};

/**
 * Set selection display mode
 *
 * @param {String} viewerSettingValue is use transparency value
 */
export let useTransparencySettingChanged = function( viewerSettingValue ) {
    viewerCtxSvc.setUseTransparency( appCtxSvc.ctx.viewer.activeViewerCommandCtx, viewerSettingValue );
};

/**
 * Set Indexed/Non-Indexed Model
 *
 * @param {Object} useIndexedCheckboxProp is use Indexed Model Object
 *
 * @return {Object} useIndexedCheckboxProp object with new Indexed Mode
 */
export let useIndexedSettingChanged = function( useIndexedCheckboxProp ) {
    var optionValue = useIndexedCheckboxProp.dbValue ? 'INDEXED' : 'NON_INDEXED';
    viewerPreferenceService.setUseAlternatePCIPreference( optionValue );
    eventBus.publish( 'viewerSettings.useIndexedModelSettingchanged' );
};

/**
 * To set PMI flat to screen
 *
 * @param {Boolean} setFlatToScreen - Boolean flag to indicate if PMI should be set flat to screen or not.
 */
export let setPMIFaltToScreen = function( setFlatToScreen ) {
    viewerCtxSvc.setFlatPMI( appCtxSvc.ctx.viewer.activeViewerCommandCtx, setFlatToScreen );
};

/**
 * to set display unit
 */
export let setDisplayUnit = function( selectedUnit, localeTextBundle ) {
    var selDisplayUnit = Object.keys( localeTextBundle ).find( function( key ) {
        return localeTextBundle[ key ] === selectedUnit;
    } );
    var unitConst = Units[ selDisplayUnit.toUpperCase() ];
    viewerPreferenceService.setDisplayUnit( unitConst );
    viewerCtxSvc.setDisplayUnit( appCtxSvc.ctx.viewer.activeViewerCommandCtx, unitConst );
};

/**
 * to set color theme
 */
export let setColorTheme = function( currentTheme, colorThemeList ) {
    let viewerCtx = appCtxSvc.getCtx( 'viewer' );
    if( currentTheme.dbValue.propInternalValue !== 'From Session' ) {

        let colorThemeListData = colorThemeList;
        for( let i = 0; i < colorThemeListData.length; i++ ) {
            if( colorThemeListData[ i ].propInternalValue === "From Session" ) {
                colorThemeListData[ i ].propDisplayValue = null;
                colorThemeListData[ i ].dispValue = null;
                colorThemeListData[ i ].propInternalValue = null;
                colorThemeListData[ i ] = null;
                colorThemeListData.length = colorThemeListData.length - 1;
            }
        }

        if( viewerCtx && viewerCtx.preference ) {
            if( viewerCtx.preference.AWC_visColorScheme !== currentTheme.dbValue.propInternalValue ) {
                viewerPreferenceService.setColorTheme( currentTheme.dbValue.propInternalValue );
            }
        }
        viewerCtxSvc.setBackgroundColorTheme( viewerCtx.activeViewerCommandCtx, currentTheme.dbValue.propInternalValue );
    }
};

/**
 * Subscribe for viewer settings panel close event
 */
var _subscribeForViewerSettingsPanelCloseEvent = function() {
    if( _viewerSettingsToolAndInfoPanelCloseEventSubscription === null ) {
        _viewerSettingsToolAndInfoPanelCloseEventSubscription = eventBus.subscribe( 'appCtx.register', function(
            eventData ) {
            if( eventData.name === 'activeToolsAndInfoCommand' ) {
                _unSubscribeForViewerSettingsPanelCloseEvent();
            }
        }, 'Awv0ViewerSettingsService' );
    }
};

/**
 * Unsubscribe for viewer settings panel close event
 */
var _unSubscribeForViewerSettingsPanelCloseEvent = function() {
    if( _viewerSettingsToolAndInfoPanelCloseEventSubscription !== null ) {
        eventBus.unsubscribe( _viewerSettingsToolAndInfoPanelCloseEventSubscription );
        _viewerSettingsToolAndInfoPanelCloseEventSubscription = null;
    }
};

/**
 * Get the localized text for given key
 *
 * @param {String} key Key for localized text
 * @return {String} The localized text
 */
function getLocalizedText( key ) {
    var localeTextBundle = getLocaleTextBundle();
    return localeTextBundle[ key ];
}

/**
 * This method finds and returns an instance for the locale resource.
 *
 * @return {Object} The instance of locale resource if found, null otherwise.
 */
function getLocaleTextBundle() {
    var resource = 'ViewerSettingsToolMessages';
    var localeTextBundle = localeSvc.getLoadedText( resource );
    if( localeTextBundle ) {
        return localeTextBundle;
    }
    return null;
}

export default exports = {
    viewerSettingsPanelRevealed,
    viewerSettingsPanelRevealThemeProp,
    shadedWithEdgesSettingChanged,
    materialSettingChanged,
    trihedronSettingChanged,
    revertRenderSettingToSSR,
    revertRenderSettingToCSR,
    renderSourceChangeCancelled,
    renderSourceChangeSuccess,
    renderSourceChangedServer,
    renderSourceChangedClient,
    showFloorSettingChanged,
    gridSettingChanged,
    shadowSettingChanged,
    reflectionSettingChanged,
    examineSettingChanged,
    walkSettingChanged,
    updateMaterialWidget,
    handleSliderChangeEvent,
    viewerFloorPlaneChanged,
    updateSelectionDisplayHighlight,
    updateShowPMIFlatToScreenFalse,
    updateShowPMIFlatToScreenTrue,
    updateSelectionDisplayTransparent,
    useTransparencySettingChanged,
    useIndexedSettingChanged,
    setPMIFaltToScreen,
    setDisplayUnit,
    setColorTheme,
    handleMaterialIconClick
};
/**
 * This factory creates a service and returns exports
 *
 * @member Awv0ViewerSettingsService
 * @memberof NgServices
 */
app.factory( 'Awv0ViewerSettingsService', () => exports );
