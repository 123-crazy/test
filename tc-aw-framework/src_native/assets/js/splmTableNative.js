// Copyright (c) 2020 Siemens

/**
 * This a name space reference to PL Table Native method.
 * _t.Const  -> all constants (splmTableConstants.js)
 * _t.util   -> all utility methods (splmTableUtils.js)
 * _t.Cell   -> cell Renderer interface
 * _t.Trv    -> PL Table Traversal
 * _t.Editor -> PL Table Edit support logic
 * _t.Ctrl   -> PL Table DOM Controller
 * _t.MenuService - > PL Table Menu Service
 *
 * @module js/splmTableNative
 */
import SPLMTableEditor from 'js/splmTableEditor';
import SPLMTableDomController from 'js/splmTableDomController';
import SPLMTableTraversal from 'js/splmTableTraversal';
import SPLMTableUtils from 'js/splmTableUtils';
import SPLMTableConstants from 'js/splmTableConstants';
import SPLMTableMenuService from 'js/splmTableMenuService';
import SPLMTableCellRenderer from 'js/splmTableCellRenderer';
import SPLMTableFillDownHelper from 'js/splmTableFillDownHelper';
import SPLMTableSelectionHelper from 'js/splmTableSelectionHelper';

var exports = {};

/*
 *  Prevent dependency tree for SPLMDomController -> SPLMTraversal -> SPLMUtils ... previous pattern
 *  This file provies the ability for inside and outside consumers to take advantage of AFX ability to use either ES6/ES5 patterns internally
 *  Route through here when needing to use the above files that return functions
 */
export let Const = SPLMTableConstants;
export let util = SPLMTableUtils;
export let Cell = SPLMTableCellRenderer;
export let Trv = SPLMTableTraversal;
export let Editor = SPLMTableEditor;
export let Ctrl = SPLMTableDomController;
export let MenuService = SPLMTableMenuService;
export let FillDownHelper = SPLMTableFillDownHelper;
export let SelectionHelper = SPLMTableSelectionHelper;

exports = {
    Const,
    util,
    Cell,
    Trv,
    Editor,
    Ctrl,
    MenuService,
    FillDownHelper,
    SelectionHelper
};
export default exports;
