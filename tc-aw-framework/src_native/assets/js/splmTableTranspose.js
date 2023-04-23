// Copyright (c) 2020 Siemens
/**
 * Definition of splmTableTranspose
 *
 * @module js/splmTableTranspose
 */
import _ from 'lodash';

/**
 * Get the first column for a transposed table
 *
 * @returns {Object} The static first column used by a transposed table, representing the property
 */
const getFirstColumn = function() {
    return {
        name: '',
        field: 'transposedColumnProperty',
        displayName: '',
        pinnedLeft: true,
        enableColumnMenu: false,
        enableColumnMoving: false,
        enableSorting: false,
        enableColumnResizing: true,
        enableRendererContribution: true,
        modifiable: false,
        width: 125
    };
};

const columnsChanged = function( columns, vmos ) {
    if( columns && columns.length === vmos.length + 1 ) {
        for( let i = 0; i < vmos.length; i++ ) {
            let vmoFound = false;
            let vmo = vmos[ i ];
            for( let j = 0; j < columns.length; j++ ) {
                let column = columns[ j ];
                if( vmo.uid === column.field ) {
                    vmoFound = true;
                }
            }
            if( vmoFound === false ) {
                return true;
            }
        }
        return false;
    }
    return true;
};

/**
 * Create a column to use in transpose
 *
 * @param {*} vmo A vmo to base the column on
 * @returns {*} A column generated for a transposed table
 */
export const getColumn = function( vmo ) {
    let displayName;
    if( vmo.displayName ) {
        displayName = vmo.displayName;
    } else if ( vmo.props.object_string ) {
        displayName = vmo.props.object_string.uiValues[0];
    } else if( vmo.props.object_name ) {
        displayName = vmo.props.object_name.uiValues[0];
    }else {
        displayName = '';
    }

    let column = {
        field: vmo.uid,
        name: vmo.uid,
        displayName: displayName,
        enableColumnMoving: true,
        enableColumnResizing: true,
        enablePinning: false,
        width: 300,
        vmo: vmo,
        enableRendererContribution: true,
        headerTooltip: true,
        modifiable: false
    };

    if( vmo.column ) {
        let mergedColumn = Object.assign( vmo.column, column );
        mergedColumn.width = mergedColumn.drawnWidth;
        return mergedColumn;
    }

    return column;
};

/**
 * Get the first column for a transposed table
 *
 * @param {Array} columns the previous columns
 * @param {Array} vmos the vmos in order
 * @returns {Object} The static first column used by a transposed table, representing the property
 */
export const getTransposedColumns = function( columns, vmos ) {
    let orderedVmos = vmos;
    // Maintain column order on recreation, if columns are same
    if( !columnsChanged( columns, vmos ) ) {
        orderedVmos = [];
        columns = _.sortBy( columns, 'index' );
        for( let i = 1; i < columns.length; i++ ) {
            let uid = columns[ i ].field;
            for( let j = 0; j < vmos.length; j++ ) {
                let vmo = vmos[ j ];
                if( vmo.uid === uid ) {
                    vmo.column = columns[ i ];
                    orderedVmos.push( vmo );
                    break;
                }
            }
        }
    }
    return [ getFirstColumn() ].concat( orderedVmos.map( getColumn ) );
};

export const getTransposedVmos = function( columns, viewModelObjects ) {
    for( let i = 0; i < columns.length; i++ ) {
        columns[ i ].visible = !columns[ i ].hasOwnProperty( 'visible' ) || columns[ i ].visible;
    }

    let visibleColumns = _.filter( columns, function( column ) {
        if( column.visible ) {
            return column;
        }
        return false;
    } );

    let columnVmos = [];
    for( let i = 0; i < visibleColumns.length; i++ ) {
        let column = visibleColumns[ i ];
        let columnVmo = {
            props: {
                transposedColumnProperty: {
                    uiValue: column.displayName,
                    dbValue: column.field
                }
            }
        };

        // Icon column is special for icon cell rendering. Add property to distinguish it from other generated vmos.
        if( column.name === 'icon' ) {
            columnVmo.name = 'icon';
        }

        for( let j = 0; j < viewModelObjects.length; j++ ) {
            let object = viewModelObjects[ j ];
            // Add icon image data for later use in icon cell rendering
            if( column.name === 'icon' ) {
                columnVmo.props[ object.uid ] = {
                    thumbnailURL: object.thumbnailURL,
                    typeIconURL: object.typeIconURL,
                    iconURL: object.iconURL
                };
            } else {
                columnVmo.props[ object.uid ] = object.props[ column.field ];
            }
        }
        columnVmos.push( columnVmo );
    }

    return columnVmos;
};

export default {
    getTransposedColumns,
    getTransposedVmos
};
