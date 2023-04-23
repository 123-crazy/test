// @<COPYRIGHT>@
// ==================================================
// Copyright 2022.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/**
 * @module js/cbaXRTCellRenderer
 */
import app from 'app';
import CadBomAlignmentCheckCellRenderer from 'js/CadBomAlignmentCheckCellRenderer';
import CadBomOccurrenceAlignmentUtil from 'js/CadBomOccurrenceAlignmentUtil';
import adapterSvc from 'js/adapterService';

 let exports = {};
 const columnToIconMap = {
    fnd0IsPrimary:'indicatorPrimaryDesign16.svg',
    fnd0IsAlignmentCurrent:'indicatorMismatch16.svg'
 };

 /**
  * Get XRT indicator renderer
  * @param {object} vmo View Model Object
  * @param {object} containerElement container element
  * @param {string} columnName column name
  * @param {array} tooltip tooltip
  */
export let getCbaXRTIndicationRenderer = function( vmo, containerElement, columnName, tooltip ) {
    let value = vmo.props[ columnName ].dbValue;

    if ( columnName === 'fnd0IsPrimary' && value || columnName === 'fnd0IsAlignmentCurrent' && !value ) {
        let icon = columnToIconMap[columnName];
        if ( icon ) {
            let iconSource = CadBomOccurrenceAlignmentUtil.getIconSourcePath( icon );

            let adaptedVmo = adapterSvc.getAdaptedObjectsSync( [ vmo ] );
            let objectType = adaptedVmo.length > 0 && adaptedVmo[ 0 ] ? adaptedVmo[ 0 ].type : vmo.type;

            let contextObject = {
                vmo: vmo,
                columnName: columnName,
                objectType: objectType
            };

            let iconElement = CadBomAlignmentCheckCellRenderer.getIconCellElement( contextObject, iconSource, containerElement, columnName, tooltip );
            if ( iconElement !== null ) {
                containerElement.appendChild( iconElement );
            }
        }
    }
};

export default exports = {
    getCbaXRTIndicationRenderer
};
app.factory( 'cbaXRTCellRenderer', () => exports );
