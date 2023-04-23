/*global
CKEDITOR5
 */

import MathUI from 'js/rmCkeInsertEquation/mathui';
import MathEditing from 'js/rmCkeInsertEquation/mathediting';
import AutoMath from 'js/rmCkeInsertEquation/automath';

export default class Math extends CKEDITOR5.Plugin {
    static get requires() {
        return [ MathEditing, MathUI, AutoMath, CKEDITOR5.Widget ];
    }

    static get pluginName() {
        return 'Math';
    }
}
