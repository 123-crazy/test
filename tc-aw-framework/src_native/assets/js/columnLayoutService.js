// Copyright (c) 2019 Siemens

/* global
 define
 */
/**
 * This module provides graph layout support
 *
 * @module js/columnLayoutService
 */
import app from 'app';
import baseGraphLayout from 'js/baseGraphLayout';
import graphConstants from 'js/graphConstants';
import AwPromiseService from 'js/awPromiseService';
import '@diagramming/columnlayout';

/**
 * Define public API
 */
var exports = {};

/**
 * Define the column layout
 *
 * @class
 * @param diagramView the diagram object
 * @param hostInterface the layout interface for host application
 */
export let ColumnLayout = function( diagramView, hostInterface ) {
    if( !hostInterface ) {
        throw 'The layout host interface has not been initialized.';
    }

    // column layout only support left-to-right direction
    hostInterface.layoutDirection = graphConstants.LayoutDirections.LeftToRight;

    var columnLayouter = new window.SDF.Layout.ColumnLayout( hostInterface );
    baseGraphLayout.BaseLayout.call( this, columnLayouter, graphConstants.DFLayoutTypes.ColumnLayout );

    this._hostInterface = hostInterface;

    this.setLayoutDirection();

    /**
     * Check if the column layout is activated
     *
     * @return true if column layout is activated, false otherwise
     */
    this.isActive = function() {
        return columnLayouter.isActive();
    };

    /**
     * activate the column layout
     *
     * @param columnDataList the column data list
     * @param edges all connections in graph
     */
    this.activate = function( columnDataList, edges ) {
        if( columnLayouter.isActive() ) {
            return;
        }
        columnLayouter.activate( columnDataList, edges );
    };

    /**
     * deactivate column layout. Exits Column Layout and clears internal objects.
     */
    this.deactivate = function() {
        columnLayouter.deactivate();
    };

    /**
     * Set option to control how columns are aligned.
     *
     * @param alignment candidate values: "start" : All columns top sides are aligned. "middle" : All columns middle
     *            align with a vertical line. "end": All columns bottom sides are aligned. The default is "middle".
     */
    this.setGraphAlignment = function( alignment ) {
        columnLayouter.setGraphAlignment( alignment );
    };

    /**
     * Set policy to control how connection ports will be allocated in layout.
     *
     * @param policy candidate values: "nodeSideMiddle": Port will be allocated at node left or right side middle
     *            when creating node connections for Left-Right column orientation. "nodeCenter": Port will be
     *            allocated at node center. The default is "nodeSideMiddle".
     */
    this.setPortLocationPolicy = function( policy ) {
        columnLayouter.setPortLocationPolicy( policy );
    };

    /**
     * Updates the graph after the given nodes sizes have changed.
     *
     * @param nodes The nodes whose sizes are changed.
     */
    this.updateOnNodeResized = function( nodes ) {
        columnLayouter.updateOnNodeResized( nodes );
    };

    /**
     * Set options to control behavior when node resize for when ColumnLayout.updateNodeResized() is called
     *
     * @param makeRoom true: if the size of a node increases, the adjacent nodes will be pushed away to make room
     *            for the enlarged node false: No location update will happen when node size changed The default is
     *            true.
     * @param reclaimSpace true: if a Node decreases in size, the adjacent nodes will be drawn closer. false: No
     *            location update will happen when node size changed The default is true.
     */
    this.setNodeResizeBehavior = function( makeRoom, reclaimSpace ) {
        columnLayouter.setNodeResizeBehavior( makeRoom, reclaimSpace );
    };

    /**
     * Apply column layout for the graph updates.
     *
     * @param {Function} - graphChangesFun the function object that can make graph changes
     *
     */
    this.applyUpdate = function( graphChangesFun ) {
        if( graphChangesFun && typeof graphChangesFun === 'function' ) {
            columnLayouter.beginCompoundCommands();
            graphChangesFun();
            columnLayouter.endCompoundCommandsAndUpdate();
        }
    };
};

/**
 * Create column layout.
 *
 * @param diagramView the diagram view object
 * @param hostInterface the host layout interface
 * @returns {promise} promise resolved with layout object
 */
export let createLayout = function( diagramView, hostInterface ) {
    var layout = new exports.ColumnLayout( diagramView, hostInterface );
    return AwPromiseService.instance.resolve( layout );
};

export default exports = {
    ColumnLayout,
    createLayout
};
/**
 * The service to provide column layout support.
 *
 * @member columnLayoutService
 * @memberof NgServices
 */
app.factory( 'columnLayoutService', () => exports );
