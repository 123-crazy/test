// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/Acp0BCTInspCompRenderService
 */
import app from 'app';
import _ from 'lodash';
import appCtxService from 'js/appCtxService';
import { bctInspectorService, BctInspectorViewer, BctInspectorViewerTable } from 'js/bct/bct-inspector';
import acp0BCTInspUtilService from 'js/Acp0BCTInspUtilService';
import listBoxService from 'js/listBoxService';

'use strict';

// Define the default view for inspector viewer
appCtxService.registerCtx('inspDrawingViewMode', true);
//Define the default balloon selection flag
appCtxService.registerCtx('isSelectAllBalloonActive', false);
//Map of selected Sheet and selected balloon or row which is maintainnig selection data in context of selected part revision
var _mapOfSheetAndSelectedBalloonsOrRows = new Map();
//Map of sheet and active mode of selection of balloon.
var _mapOfSheetAndSelectAllMode = new Map();
//Map of Char Options
var _mcharOptions = new Map();
//List of updated imported PMI
var _mUpdatedImportedPMICharUId = [];

var exports = {};

/*
*This method called on selection change in drawing sheet list box.
*/
export let drawingSheetSelectionChange = function (ctx, data) {
    if (data.acp0DrawingSheetList && ctx.selectedSheet !== data.acp0DrawingSheetList.dbValue) {
        ctx.isSelectAllBalloonActive = _mapOfSheetAndSelectAllMode.get(data.acp0DrawingSheetList.dbValue);
        ctx.isSelectAllBalloonActive = ctx.isSelectAllBalloonActive === undefined ? false : ctx.isSelectAllBalloonActive;
        exports.renderBCTInspViewer(ctx, data);
    }
};

/*
 * @param {Object} ctx context Object
 * @param {object} data object for read messages

 */
export let getProjectAndRenderBCTInspViewer = function (ctx, data) {
    //Reset the context registartion value.
    ctx.projectToRenderBctComponent = undefined;
    ctx.selectedSheet = undefined;
    ctx.bctInspSelection = undefined;
    ctx.fileTypeOfProject = undefined;
    ctx.isSelectAllBalloonActive = false;
    ctx.renderingErrorMessage = undefined;
    //ctx.bctInspViewer2dToRender = undefined;
    //ctx.bctInspViewerTableToRender = undefined;
    _mapOfSheetAndSelectedBalloonsOrRows.clear();
    _mapOfSheetAndSelectAllMode.clear();
    var renderPart = ctx.selectedPart;
    if (renderPart) {
        //Get Project as an input of inspector view to render
        acp0BCTInspUtilService.getPartAttachmentProject(renderPart.uid, data.i18n).then(values => {
            //Make global acess to project object for rendering BCT components
            ctx.projectToRenderBctComponent = values.project;
            if (ctx.projectToRenderBctComponent && !ctx.renderingErrorMessage) {
                var sheetsFromProject = ctx.projectToRenderBctComponent.sheets;
                data.drawingSheetList = listBoxService.createListModelObjects(sheetsFromProject, 'name');
                if (data.acp0DrawingSheetList) {
                    data.acp0DrawingSheetList.dbValue = sheetsFromProject[0];
                    data.acp0DrawingSheetList.uiValue = sheetsFromProject[0].name;
                }
                //Validate and return the sheet from which Balloon was imported and want to show on Ui
                var characteristicsIds = appCtxService.ctx.charUidOfImpPMI;
                if (characteristicsIds && characteristicsIds.length === 1 && appCtxService.ctx.xrtPageContext.secondaryXrtPageID === 'tc_xrt_PMI') {
                    data.acp0DrawingSheetList.dbValue = _getImportedBalloonSheetOnListBox(sheetsFromProject, characteristicsIds[0]);
                }
                //Calling components to render
                exports.renderBCTInspViewer(ctx, data);
            }
        });
    }
};

/*
* This function read the license key and set by calling BCT service setLicensekey function
*Currently added as a placeholder in AW5.2 will enhance to read actaull licence keay from preference and then send to BCT for validate.
*/
export let readAndSetLicenseKey = function () {
    bctInspectorService.setLicenseKey().then(isLicenseSet => {
        appCtxService.ctx.isBCTLicenseSet = isLicenseSet;
    }
    );
};

/*
 * @param {Object} ctx context view model
 * @param {object} data object for read required information
 */
export let renderBCTInspViewer = function (ctx, data) {
    //Based on the view mode calling component to render
    var drawingViewMode = data.i18n.Acp0DrawingViewTitle;
    var tableViewMode = data.i18n.Acp0TableViewTitle;
    var project = ctx.projectToRenderBctComponent;
    if (project) {
        if (ctx.inspCombineViewMode || ctx.inspDrawingViewMode) {
            // if(!ctx.bctInspViewer2dToRender) {
            var bctInspViewForDrawing = document.getElementById('bctInspViewIdForDrawing');
            new BctInspectorViewer(bctInspViewForDrawing, self.prepareInspViewComponentInput(project, drawingViewMode, data));
            //ctx.bctInspViewer2dToRender = new bctInspViewer2d(bctInspViewForDrawing,self.prepareInspViewComponentInput( project, drawingViewMode, data ));
            //}
            //else {
            //    ctx.bctInspViewer2dToRender.render(self.prepareInspViewComponentInput( project, drawingViewMode, data ));
            //}
        }
        if (ctx.inspCombineViewMode || ctx.inspTableViewMode) {
            //if(!ctx.bctInspViewerTableToRender) {
            var bctInspViewIdForTable = document.getElementById('bctInspViewIdForTable');
            new BctInspectorViewerTable(bctInspViewIdForTable, self.prepareInspViewComponentInput(project, tableViewMode, data));
            //ctx.bctInspViewerTableToRender = new bctInspViewerTable(bctInspViewIdForTable,self.prepareInspViewComponentInput( project, tableViewMode, data ));
            //}
            //else {
            //    ctx.bctInspViewerTableToRender.render(self.prepareInspViewComponentInput( project, tableViewMode, data ));
            //}
        }
    }
};

/*
*To select or deselect all the balloons from BCT Inspector View.
*/
export let selectDeselectAllBalloonFromInspectorView = function (ctx, data) {
    if (ctx.selectedSheet) {
        self.manageVisibilityOfSelectDeselectAllCommand(ctx, true);
        var characteristics = ctx.isSelectAllBalloonActive ? ctx.selectedSheet.characteristics : [];
        _mapOfSheetAndSelectedBalloonsOrRows.set(ctx.selectedSheet, characteristics);
        exports.renderBCTInspViewer(appCtxService.ctx, data);
    }
};

/*
 * @param {Object} ctx context view model
 * @param {object} data object for read required information
 * @param {string} inspViewMode object for read required information
 */
export let setInspectorViewMode = function (ctx, data, inspViewMode) {
    ctx.inspDrawingViewMode = false;
    ctx.inspTableViewMode = false;
    ctx.inspCombineViewMode = false;
    switch (inspViewMode) {
        case data.i18n.Acp0DrawingViewTitle:
            ctx.inspDrawingViewMode = true;
            _checkForRenderBCTInspViewer(ctx, data);
            break;
        case data.i18n.Acp0TableViewTitle:
            ctx.inspTableViewMode = true;
            _checkForRenderBCTInspViewer(ctx, data);
            break;
        default:
            ctx.inspCombineViewMode = true;
            _checkForRenderBCTInspViewer(ctx, data);
    }
};

/*
 * To manage visibility of select and deselect all toggle command based on sheet selection.
 */
self.manageVisibilityOfSelectDeselectAllCommand = function (ctx, cmdClick) {
    if (ctx.isSelectAllBalloonActive) {
        ctx.isSelectAllBalloonActive = false;
    } else {
        if (cmdClick || !_mapOfSheetAndSelectedBalloonsOrRows.get(ctx.selectedSheet) || //
            ctx.selectedSheet.characteristics.length === _mapOfSheetAndSelectedBalloonsOrRows.get(ctx.selectedSheet).length) {
            ctx.isSelectAllBalloonActive = true;
        }
    }
    _mapOfSheetAndSelectAllMode.set(ctx.selectedSheet, ctx.isSelectAllBalloonActive);
    return ctx.isSelectAllBalloonActive;
};

/*
 * @param {Object} project project object
 * @param {string} viewMode string to get mode
 */
self.prepareInspViewComponentInput = function (project, viewMode, data) {
    var characteristicsIds = appCtxService.ctx.charUidOfImpPMI;
    var isSelectEnableMode = characteristicsIds && appCtxService.ctx.xrtPageContext.secondaryXrtPageID === 'tc_xrt_PMI' ? 'none' : 'multi';
    // Maintain sheet selection in session for rendering components in perticular view mode.
    appCtxService.ctx.selectedSheet = data.acp0DrawingSheetList ? data.acp0DrawingSheetList.dbValue : appCtxService.ctx.selectedSheet;
    var selectedSheet = appCtxService.ctx.selectedSheet;
    //******************Imported and Modified+Imported PMI LIST*********************************
    var updatedImportedPMICharUId = [];
    _mUpdatedImportedPMICharUId = [];
    var characteristicOptionsMap = new Map();
    //var sheetFromBaseRevisionToCompare;
    _mcharOptions.clear();
    var baseRevisionProjectData = appCtxService.ctx.baseRevisionSelection;
    var baseSelectedPart = appCtxService.ctx.baseSelectedPart;
    var selectedPart = appCtxService.ctx.selectedPart;
    //var sheetFromBaseRevisionToCompare = _returnBaseRevisionSheet(baseRevisionProjectData, selectedSheet);

    if (characteristicsIds) {
        //Comparison happened only when Compare Revisions panel is open  
        if(baseRevisionProjectData && selectedPart !== baseSelectedPart){
            for (var characteristic of selectedSheet.characteristics) {
                if (characteristicsIds && characteristicsIds.indexOf(characteristic.id) !== -1 /*&& (characteristic.props.get('K2504') === 1 )*/) {
                    //  if (characteristic.props.get('K2504') === 1) {
                    //      updatedImportedPMICharUId.push(characteristic.id);
                    //  }
                    //  else {
                            var check = compareCharacteristic(_returnBaseRevisionChar(baseRevisionProjectData, characteristic), characteristic);
                            //Fix the coverity issue to avoid dead code
                            if(!check) {
                                updatedImportedPMICharUId.push(characteristic.id);
                            }
                    //}
                }
            }
        }
        characteristicOptionsMap.set('imported', characteristicsIds);
        _mUpdatedImportedPMICharUId = updatedImportedPMICharUId;
        updatedImportedPMICharUId ? characteristicOptionsMap.set('importedUpdated', updatedImportedPMICharUId) : 'Nothing ToDo';
    }
    //*****************Modified Imported PMI LIST**********************************
    appCtxService.ctx.bctInspSelection = _mapOfSheetAndSelectedBalloonsOrRows.get(selectedSheet);
    var propsForRendering = {
        project: project,
        select: isSelectEnableMode,
        onSelectionChange: function (value) {
            appCtxService.ctx.bctInspSelection = value;
            _mapOfSheetAndSelectedBalloonsOrRows.set(appCtxService.ctx.selectedSheet, value);
            self.manageVisibilityOfSelectDeselectAllCommand(appCtxService.ctx, false);
            //It requires to call for syncronization between two component
            exports.renderBCTInspViewer(appCtxService.ctx, data);
        },
        selected: _mapOfSheetAndSelectedBalloonsOrRows.get(selectedSheet) || [], //Undefined should not be pass as selected in BCT code undefined means maintain the previous selections.
        //Prepare characteristic options Map to handle the higlight balloons with different color
        characteristicOptions: characteristicsIds ? _getcharacteristicOptionsMap(characteristicOptionsMap) : null
    };

    switch (viewMode) {
        case data.i18n.Acp0DrawingViewTitle:
            // Below are the input parameters suppose to pass for 2dDRawing component.
            // project:values.project, //Mandatory
            // page:'0',               //Mandatory
            // select:'multi',
            // characteristic-options:null,
            // selected:null,
            // disabled: false,
            // balloonsHidden:false,
            // on-click:null,
            // on-double-click:null,
            // onSelectionChange:null
            var sheetIndex = project.sheets && selectedSheet ? project.sheets.indexOf(selectedSheet) : 0;
            propsForRendering.page = sheetIndex > -1 ? sheetIndex : '0';
            appCtxService.ctx.drawingRenderingSheet = selectedSheet;
            appCtxService.ctx.selectedBalloon = appCtxService.ctx.bctInspSelection;
            break;
        case data.i18n.Acp0TableViewTitle:
            // Below are the input parameters suppose to pass for table component.
            // project:values.project, //Mandatory
            // characteristics:'null',
            // select:'none',
            // characteristic-options:null,
            // selected:null,
            // disabled: false,
            // on-click:null,
            // on-double-click:null,
            // onSelectionChange:null
            propsForRendering.characteristics = selectedSheet ? selectedSheet.characteristics : null;
            appCtxService.ctx.tableRenderingSheet = selectedSheet;
            appCtxService.ctx.selectedRow = appCtxService.ctx.bctInspSelection;
            break;
        default:
        //Nothing to do
    }
    return propsForRendering;
};

/*
* This method checks its actaually need to render BCT inspector or not
* This requires as drawing or table component lodaded based on sheet selection and selected row and balloon selection.
*/
function _checkForRenderBCTInspViewer(ctx, data) {
    var rowSelectionChange = ctx.selectedRow !== ctx.bctInspSelection;
    var balloonSelectionChange = ctx.selectedBalloon !== ctx.bctInspSelection;
    var sheetChangedForDrawing = ctx.selectedSheet !== ctx.drawingRenderingSheet;
    var sheetChangedForTable = ctx.selectedSheet !== ctx.tableRenderingSheet;
    if (sheetChangedForDrawing || sheetChangedForTable || rowSelectionChange || balloonSelectionChange) {
        exports.renderBCTInspViewer(ctx, data);
    }
}

/*
* This function compare  the characteristics.
 * @param {Object} fromCharacteristic charcteristic object
 * @param {Object} toCharacteristic charcteristic object
 * @param {Array} fieldIds array to get list of fields to compare
*/
function compareCharacteristic(fromCharacteristic, toCharacteristic, fieldIds) {
    //Required fields for compare 
    /**
     * K2101:Nominal Value
     * B2005:Criticality
     * K2112:Lower Tolerance
     * K2113:Upper Tolerance
     * K2142:Unit Of Measure
     * :Sheet Name
     * :X & Y & Z Coordinates
     * :Characteristic Number
    */
    fieldIds = ['B2005', 'K2112', 'K2113','K2101','K2142'];
    if(fromCharacteristic) {
        var fromProps = fromCharacteristic.props;
        var toProps = toCharacteristic.props;
        //As per current requirement given fields are important to check value updation for char spec so avoiding to check prop size difference
        //if (fromProps.size !== toProps.size) { return false; }
        for (var [key, value] of fromProps) {
            if (fieldIds.includes(key) && toProps.get(key) !== value) {
                console.log("key" + key);
                console.log("false" + key);
                return false;
            }
        }
    }
    return true;
}

/*
* This function generates the characteristics option(highlight particular characteristics) to render the components.
*/
function _getcharacteristicOptions(cssClassName, characteristicsIds) {
    var charOptionObj = {
        className: [cssClassName]
    };
    for (var characteristicsId of characteristicsIds) {
        _mcharOptions.set(characteristicsId, charOptionObj);
    }
}
/*
* This function to iterate characteristics option Map to generate the characteristics option(highlight particular characteristics) to render the components.
*/
function _getcharacteristicOptionsMap(characteristicOptionsMap) {
    for (var characteristicOptions of characteristicOptionsMap.entries()) {
        _getcharacteristicOptions(characteristicOptions[0], characteristicOptions[1]);
    }
    return _mcharOptions;
}
/*
* This function to get the sheet from which PMIs are imported.
*/
function _getImportedBalloonSheetOnListBox(sheetsFromProject, characteristicsId) {
    for (var sheet of sheetsFromProject) {
        for (var characteristic of sheet.characteristics) {
            if (characteristic.id === characteristicsId) {
                return sheet;
            }
        }
    }
    return;
}

// /*
// * This function to get the Charcteristics from base revision sheet by comapring current rendered sheets charcteristics.
// */
// function _returnBaseRevisionChar(sheetFromBaseRevisionToCompare, characteristic) {
//     for (var baseChar of sheetFromBaseRevisionToCompare.characteristics) {
//         if (baseChar.id === characteristic.id) {
//             return baseChar;
//         }
//     }
//     return;
// }

/*
* This function to get the Charcteristics from base revision sheet by comapring current rendered sheets charcteristics.
*/
function _returnBaseRevisionChar(baseRevisionProjectData, characteristic) {
    if(baseRevisionProjectData){
        for(var sheetFromBaseRevisionToCompare of baseRevisionProjectData.sheets ){
            for (var baseChar of sheetFromBaseRevisionToCompare.characteristics) {
                if (baseChar.id === characteristic.id) {
                    return baseChar;
                }
            }
        }
    }
    return;
}

/*
* This function to get the sheet from base revision by comparing current rendered sheet.
*/
function _returnBaseRevisionSheet(baseRevisionProjectData, selectedSheet) {
    if (baseRevisionProjectData) {
        for (var sheetFromBaseRevisionToCompare of baseRevisionProjectData.sheets) {
            if (sheetFromBaseRevisionToCompare.name === selectedSheet.name) {
                return sheetFromBaseRevisionToCompare;
            }
        }
    }
    return;
}

export default exports = {
    drawingSheetSelectionChange,
    getProjectAndRenderBCTInspViewer,
    readAndSetLicenseKey,
    renderBCTInspViewer,
    selectDeselectAllBalloonFromInspectorView,
    setInspectorViewMode
};
/**
 *
 * @memberof NgServices
 * @member Acp0BCTInspCompRenderService
 */
app.factory('Acp0BCTInspCompRenderService', () => exports);

/**
 * Since this module can be loaded as a dependent DUI module we need to return an object indicating which service
 * should be injected to provide the API for this module.
 */
export let moduleServiceNameToInject = 'Acp0BCTInspCompRenderService';
