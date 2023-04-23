// Copyright (c) 2019 Siemens

/* global
 define
 */
/**
 * This module define graphLabelEditService
 *
 * @module js/graphLabelEditService
 */
import app from 'app';
import $ from 'jquery';
import _ from 'lodash';
import internalGraphUtils from 'js/internalGraphUtils';
import logSvc from 'js/logger';
import dfCommands from 'js/diagramFoundationCommands';

var exports = {};

/**
 * @constructor
 *
 * @class
 * @param {Object} graphModel - the graph model object
 * @param {Object} diagramView - the diagram view object
 */
export let LabelInlineEditor = function( graphModel, diagramView ) {
    var originalLabelText = null;
    /**
     * Show in-line label edit box
     *
     * @param {Position} position - coordinate of edit
     * @param {SheetElement} targetElement - target element editing
     * @param {String} originalText - original text before editing
     * @param {String} cssClass - name of the css
     * @param {String} cssString - inline style string
     */
    this.showLabelInlineEditor = function( position, targetElement, originalText, cssClass, cssString ) {
        if( !diagramView || !position || !targetElement ) {
            return;
        }

        // The following snippets is a workaround for label of port and edge editing.
        // It makes the allowWrapping and maxWidth work simultaneously
        var ownType = targetElement.getOwner().getItemType();
        var maxWidth = 0;
        var allowWrapping = false;

        if( ownType === 'Edge' &&
            _.has( graphModel, 'config.defaults.edgeLabel.maxWidth' ) &&
            _.has( graphModel, 'config.defaults.edgeLabel.allowWrapping' ) ) {
            maxWidth = graphModel.config.defaults.edgeLabel.maxWidth;
            allowWrapping = graphModel.config.defaults.edgeLabel.allowWrapping;
        }
        if( ownType === 'Port' &&
            _.has( graphModel, 'config.defaults.portLabel.maxWidth' ) &&
            _.has( graphModel, 'config.defaults.portLabel.allowWrapping' ) ) {
            maxWidth = graphModel.config.defaults.portLabel.maxWidth;
            allowWrapping = graphModel.config.defaults.portLabel.allowWrapping;
        }
        if( maxWidth > 0 && allowWrapping ) {
            targetElement.setWidthValue( maxWidth );
        }

        originalLabelText = originalText;

        var textEditCommand = diagramView.getManager().getCommandManager().getCommand(
            dfCommands.TEXT_EDIT_COMMAND );
        var textEditor = textEditCommand.getInlineEditor();

        if( textEditor && _.isString( cssClass ) ) {
            $( textEditor ).addClass( cssClass );
        }

        var textElement = targetElement.getSVGDom().getElementsByTagName( 'text' );

        var inlineCssTextStr = 'height:auto;';
        var style = window.getComputedStyle( textElement[ 0 ], null );

        var fontSize = style.fontSize;

        if( cssString ) {
            inlineCssTextStr += cssString;
        }

        inlineCssTextStr += 'font-size:' + fontSize;

        textEditCommand.executeInlineEditor( position, targetElement, originalText, false, null,
            inlineCssTextStr );
    };

    /**
     * Fire the 'awGraph.labelTextChanged' event
     *
     * @param {Annotation} targetElement - Label is editing
     * @param {String} newText - the new text
     */
    this.commitLabelEdit = function( targetElement, newText ) {
        if( newText !== originalLabelText ) {
            internalGraphUtils.publishGraphEvent( graphModel, 'awGraph.labelTextChanged', {
                label: targetElement,
                oldValue: originalLabelText,
                newValue: newText
            } );
        }
        originalLabelText = null;
    };

    /**
     * Hide in-line label edit box and destroy it
     *
     */
    this.hideLabelInlineEditor = function() {
        var textEditCommand = diagramView.getManager().getCommandManager().getCommand(
            dfCommands.TEXT_EDIT_COMMAND );
        if( textEditCommand ) {
            textEditCommand.finishInlineTextEditing();
        }
    };

    return this;
};

/**
 * Create the label in line editor
 *
 * @param {Object} graphModel - the graph model object
 * @param {Object} diagramView - the diagram view object
 */
export let createLabelInlineEditor = function( graphModel, diagramView ) {
    return new exports.LabelInlineEditor( graphModel, diagramView );
};

export default exports = {
    LabelInlineEditor,
    createLabelInlineEditor
};
/**
 * The factory to create label edit service.
 *
 * @member graphLabelEditService
 * @memberof NgServices
 */
app.factory( 'graphLabelEditService', () => exports );
