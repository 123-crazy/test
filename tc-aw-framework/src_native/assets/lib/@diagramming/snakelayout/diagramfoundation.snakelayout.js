// @<COPYRIGHT>@
// ==================================================
// Copyright Siemens 2020.
// PL Diagram Foundation 1973.0.1-0
// ==================================================
// @<COPYRIGHT>@
var t,n;t=this,n=function(T,t,i){"use strict";function n(t,i,n){T.HVPaths.call(this,t,i,n,t.isRSOPEnabled)}function s(){T.LayoutSessionData.call(this),this.Oh=800,this.ic={x:0,y:0},this.padding={top:0,bottom:0,left:0,right:0},this.Bu="none"}function u(t,i,n,s,r,h,o,e,u){T.GluePoint.call(this,t,i,h,o,e,u),this.upperRange=n,this.lowerRange=s,this.t0=r,this.i0=(s-n)/(r+1)}function r(t,i,n){T.AllocateGluePoints.call(this,t,i,n)}T=T&&Object.prototype.hasOwnProperty.call(T,"default")?T.default:T,t=t&&Object.prototype.hasOwnProperty.call(t,"default")?t.default:t,i=i&&Object.prototype.hasOwnProperty.call(i,"default")?i.default:i,n.prototype.vi=function(){var t=this.changeStateObj,i=new T.ValidDistCalculator(this.layoutSessionData).nl();this.zw=new T.AStarPathPlanning(this.reportError),this.zw.Xw=!0,this.zw.i2(t,this.edgeDist,i);for(var n,s=t.cList,r=s.length,h=0;h<r;++h)(n=s[h]).ignore||this.gi(n)},t.common.ObjectHelper.inherit(n,T.HVPaths),t.common.ObjectHelper.inherit(s,T.LayoutSessionData),
u.prototype.getPoint=function(){var t=this.changeNode,i=t.x,n=t.y;switch(this.nodeSide){case"bottom":i+=this.upperRange+this.i0*(this.rank+1),n+=t.h;break;case"left":n+=this.upperRange+this.i0*(this.rank+1);break;case"right":i+=t.w,n+=this.upperRange+this.i0*(this.rank+1);break;case"top":i+=this.upperRange+this.i0*(this.rank+1)}return{x:i,y:n}},u.prototype.tl=function(){var t=this.changeNode,i=this.nodeSide;t.gluePointLists[i].push(this)},u.prototype.pl=function(){this.vl(),this.changePort.Hu=null,this.changePort.hl===this&&(this.changePort.hl=null)},u.prototype.vl=function(){for(var t=this.changeNode,i=this.nodeSide,n=t.gluePointLists[i],s=0,r=n.length;s<r;s++)if(n[s]===this){n.splice(s,1);break}},t.common.ObjectHelper.inherit(u,T.GluePoint),r.prototype.Iu=function(t,i,n){var s,r=this.Au,h=this.changeStateObj.nList,o=h.length;if("fixed"!==t)if("equalSpacedOnOneSide"!==t){for(var e,u=0;u<o;++u)if(!(s=h[u]).ignore)for(var f,a=(f=s.ki).length,c=0;c<a;++c)(e=f[c]).Hu||!1===r.Tl(e
)&&this.Nf(e);for(u=0;u<o;++u)(s=h[u]).ignore||this.Qa(s)}else{var v=this.n0();this.s0(v);for(var u=0;u<o;++u)(s=h[u]).ignore||(s.gluePointLists.top=[],s.gluePointLists.left=[],s.gluePointLists.bottom=[],s.gluePointLists.right=[],this.r0(s,v,i,n));d(v)}else for(var u=0;u<o;++u)(s=h[u]).ignore||this.$a(s)},r.prototype.h0=function(t){for(var i=this.changeStateObj,n=this.Au,s=t.ki,r=s.length,h=[],o=[],e=[],u=0;u<r;++u){var f,a=s[u];n.Tl(a)?(f=i.u1(a),((f=i.o0(a)?!f:f)?h:o).push(a)):e.push(a)}var c=this.layoutSessionData.Ft;return h.sort(v.bind(null,t,c)),o.sort(l.bind(null,t,c)),{sourcePorts:h,targetPorts:o,unconnectedPorts:e}};function c(t){var i=t.length;if(!(i<=0)){for(var n=t[0].conn.xORyValue,s=t[0].conn.xORyValue,r=1;r<i;r++)t[r].conn.xORyValue<n&&(n=t[r].conn.xORyValue),t[r].conn.xORyValue>s&&(s=t[r].conn.xORyValue);return{upperRange:n,lowerRange:s}}}var v=function(t,i,n,s){var r=n.ti,h=n.changeCon.yi,o=s.changeCon.yi,s=r.isWrapped,e=0;switch(r.Oi){case"TB":e=h.x>o.x?1:-1;break
;case"LR":e=h.y>o.y?1:-1;break;case"BT":e=h.x>o.x?1:-1;break;default:e=h.y>o.y?1:-1}return e=s?0-e:e},l=function(t,i,n,s){var r=n.ti,h=n.changeCon.bi,o=s.changeCon.bi,e=0;switch(r.Oi){case"TB":e=h.x>o.x?1:-1;break;case"LR":e=h.y>o.y?1:-1;break;case"BT":e=h.x>o.x?1:-1;break;default:e=h.y>o.y?1:-1}return e},d=function(t){for(var i=0,n=t.length;i<n;i++)for(var s=t[i].connections,r=0,h=s.length;r<h;r++)s[r].isStraightLine&&(delete s[r].isStraightLine,delete s[r].xORyValue)};function h(t,i,n,s){T.ChangeState.call(this,t,i,n,s),this.e0={top:"bottom",bottom:"top",left:"right",right:"left"}}function o(){}function b(t,i){this.Jh=t,this.reportError=i,this.u0=[],this.allRelEdgeItems=[],this.f0=[],this.a0=[],this.c0=[]}r.prototype.n0=function(t){(t||this.changeStateObj.cList).length;return[]},r.prototype.s0=function(t){for(var i=0,n=t.length;i<n;i++)for(var s=t[i].nodes,r=t[i].connections,h=this.v0(s),o=0,e=r.length;o<e;o++)r[o].isStraightLine=!0,r[o].xORyValue=h/2},r.prototype.v0=function(t){for(
var i=this.l0(),n=t[0][i],s=1,r=t.length;s<r;s++)t[s][i]<n&&(n=t[s][i]);return n},r.prototype.l0=function(){var t=this.layoutSessionData.Ft;return t===T.LayoutDirection.LeftToRight||t===T.LayoutDirection.RightToLeft?"h":"w"},r.prototype.r0=function(t,i,n,s){var r=this.h0(t),i=function(t,i){for(var n=0,s=i.length;n<s;n++)if(0<=i[n].nodes.indexOf(t))return!0;return!1}(t,i);s?this.Ku(t,r.sourcePorts):this.d0(t,r.sourcePorts,i),n?this.Ku(t,r.targetPorts):this.d0(t,r.targetPorts,i)},r.prototype.d0=function(t,i,n){if(!(i.length<=0)){var s=[];if(n){var r=this.b0(t,i);if(r.middle.length<=0)s.push(r.upper),s.push(r.lower);else{this.m0(t,r.upper,0,r.middleUpperValue);for(var h=0,o=r.middle.length;h<o;h++)this.m0(t,[r.middle[h].port],r.middle[h].conn.xORyValue,r.middle[h].conn.xORyValue);this.m0(t,r.lower,r.middleLowerValue,t[this.l0()])}}else s.push(i);for(var e=s.length,u=0;u<e;u++){var f=s[u];this.m0(t,f,0,t[this.l0()])}}},r.prototype.b0=function(t,i){for(var n={upper:[],middle:[],lower:[]},
s=0,r=i.length;s<r;s++){for(var h,o=i[s],e=!1,u=this.changeStateObj._i(o),f=0,a=u.length;f<a;f++)if(u[f].isStraightLine){e=!0,h=u[f];break}e?n.middle.push({port:o,conn:h}):(n.middle.length<=0?n.upper:n.lower).push(o)}this.g0(t,n);t=c(n.middle);return t&&(n.middleUpperValue=t.upperRange,n.middleLowerValue=t.lowerRange),n},r.prototype.g0=function(t,i){if(!(i.middle.length<=1)){for(var n=!1,s=i.middle[0].conn.xORyValue,r=1,h=i.middle.length;r<h;r++)i.middle[r].conn.xORyValue===s&&(n=!0);if(n){for(var o=t[this.l0()],e=i.upper.concat(),u=i.middle.concat(),f=i.lower.concat();1<u.length;){var a=e.length,c=f.length,v=s;0<a&&(v/=a+1);a=o-s;0<c&&(a/=c+1),a<=v?e.push(u.shift()):f.unshift(u.pop())}var l=s,t=e.length;0<t&&(l/=t+1);for(r=(h=t)-1;0<=r;r--)e[r].conn&&(e[r].conn.xORyValue=s-l*(h-r));var d=o-s,t=f.length;0<t&&(d/=t+1);for(r=0,h=t;r<h;r++)f[r].conn&&(f[r].conn.xORyValue=s+d*(r+1));this.p0(i.middle,s,e,f)}}},r.prototype.p0=function(t,i,n,s){for(var r=t[0].conn.yi[this.l0()],h=0,o=0,e=0,
u=n.length;e<u;e++)n[e].conn&&h++;for(e=0,u=s.length;e<u;e++)s[e].conn&&o++;t=c(t);if(t.upperRange<=0)for(var f=i/(h+1),e=h-1;0<=e;e--)n[e].conn.xORyValue=i-f*(h-e);if(t.lowerRange>=r)for(f=(r-i)/(o+1),e=0;e<o;e++)s[e].conn.xORyValue=i+f*(e+1)},r.prototype.m0=function(t,i,n,s){for(var r=i.length,h=0;h<r;++h){var o=i[h],e=this.changeStateObj._i(o);new u("attachment",this.changeStateObj.wi(o),n,s,r,h,t,o,e)}},r.prototype.Ku=function(t,i){if(!(i.length<1))for(var n=this.changeStateObj,s=t[this.l0()],r=0,h=i.length;r<h;++r){var o=i[r],e=n._i(o);new u("attachment",n.wi(o),0,s,1,0,t,o,e)}},r.prototype.yf=function(t){var i=t.Hu;if(i)for(var n=i.changeNode,s=i.nodeSide,r=n.gluePointLists[s],h=r.length-1;0<=h;h--)(i=r[h])&&i.changePort===t&&i.pl()},r.prototype.Vu=function(){},r.prototype.Fu=function(t){for(var i,n,s=this.changeStateObj,r=t.ki,h=r.length,o=0;o<h;++o)(i=r[o]).ignore||(n=i.Hu)&&(n=n.getPoint(),i.Hi(n.x-i.w/2,n.y-i.h/2),s.Vi(i))},t.common.ObjectHelper.inherit(r,T.AllocateGluePoints
),h.prototype.C2=function(t){T.ChangeState.prototype.C2.apply(this,arguments),t.Jh&&t.hostNode&&(t.padding=this.hostInterfaceObj.getGroupNodePadding(t.hostNode))},h.prototype.D2=function(t){var i,n=t.Si;null!==n&&(i=this.hostInterfaceObj.getSourcePort(n),n=this.hostInterfaceObj.getTargetPort(n),i&&n&&(T.ChangeState.prototype.D2.call(this,t),(i=this.ru(i))&&(i.Oi=2,i.changeCon=t),(n=this.ru(n))&&(n.Oi=1,n.changeCon=t),t.mi=i,t.pi=n))},h.prototype.wi=function(t){var i=t.ti.Oi,n=this.u1(t),s="bottom";switch(i){case"TB":s=n?"bottom":"top";break;case"LR":s=n?"right":"left";break;case"BT":s=n?"top":"bottom";break;case"RL":s=n?"left":"right"}return s=this.o0(t)?this.e0[s]:s},h.prototype.o0=function(t){var i=!1,n=t.changeCon;return n&&n.Wu&&(n.Zu?t===n.mi&&(i=!0):t===n.pi&&(i=!0)),i},t.common.ObjectHelper.inherit(h,T.ChangeState),o.Map=i.NormalObjectMap,o.findItemInList=function(t,i){return T.LayoutHelper.findItemInList(t,i)},o.removeItemInList=function(t,i){
return T.LayoutHelper.removeItemInList(t,i)};function p(t,i){for(var n=t.length,s=[],r=0;r<n;r++)for(var h=t[r],o=h.w0(!0),e=h.k0,u=o.length,f=0;f<u;f++){var a=o[f],c=i.indexOf(a);c<0||(i.splice(c,1),a.k0<e+1&&(a.k0=e+1,s.push(a)))}0<s.length&&p(s,i)}function e(t,i){this.reportError=i,t&&(t.y0&&this.reportError("The relation data for node already exist"),(t.y0=this).hostNode=t,this.k0=0),this.T0=[],this.outRelEdges=[]}function f(t,i,n,s){t.O0&&s("The relation data for connection already exist"),(t.O0=this).hostEdge=t,this.srcRelNode=i,this.tarRelNode=n}function a(t){this.reportError=t,this.x0=new o.Map,this.rootGrpRelation=new m(null,this.reportError),this.rootGrpRelation.isExpanded=!0}function m(t,i){this.reportError=i,this.hostNode=t,this.isExpanded=!1,this.R0=null,this.B0=[],this.co=[],this.S0=[],this.L0=[],this.q0=[],this.relationTreeObj=null}function g(t,i){(this.changeNode=t).snakeNode&&i&&i("SnakeNode: Snake node data already exit on reference node."),(t.snakeNode=this).j0=[],
this.P0=[],this.N0=null,this.x=t.x,this.y=t.y,this.h=t.h,this.w=t.w,this.isGroupNode=t.Jh,this.isExpanded=t.Qh;t=t.padding;this.padding=t?{top:t.top,bottom:t.bottom,left:t.left,right:t.right}:{top:0,bottom:0,left:0,right:0},this.A0=null,this.E0=null}function w(t){this.x=0,this.y=0,this.w=0,this.h=0,this.Qi=[],this.nodeDist=null,this.I0=0,this.U0=t,this.z0=!1}b.prototype.C0=function(){for(var t=this.u0.concat(),i=t.length,n=[],s=[],r=[],h=0;h<i;h++)(((f=t[h]).k0=0)===f.T0.length?0===f.outRelEdges.length?r:n:s).push(f);var o=n.length,e=s.length;0===o&&0<e&&(n.push(s[0]),s.splice(0,1),o=1);for(h=0;h<o;h++)p(n,s);for(var u=[],h=0;h<i;h++){var f=t[h];0<=r.indexOf(f)||(u[m=f.k0]||(u[m]=[]),u[m].push(f))}if(0<r.length){for(var a=u.length,c=1,h=0;h<a;h++)c<(v=u[h].length)&&(c=v);for(h=0;h<a&&0!==r.length;h++)for(var v,l=u[h],d=v=l.length;d<c;d++){f=r[0];if(r.splice(0,1),f.k0=h,l.push(f),0===r.length)break}for(var b=0,m=a,g=r.length,h=0;h<g;h++)b++,u[(f=r[h]).k0=m]||(u[m]=[]),u[m].push(f),
c<=b&&(m++,b=0)}this.f0=u},b.prototype.D0=function(){return this.f0},b.prototype.getHostRootNode=function(){return this.F0.hostNode},b.prototype.ls=function(){for(var t=[],i=this.u0,n=0,s=i.length;n<s;++n)t.push(i[n].hostNode);return t},b.prototype.G0=function(t,i,n,s){var r=[];if(i)for(var h=0,o=i.length;h<o;++h){var e=this.H0(i[h],n[h],s[h]);e&&0<e.length&&(r=r.concat(e))}if(t)for(var u,h=0,o=t.length;h<o;++h)this.J0(t[h])||(u=this.K0(t[h]),r.push(u));this.C0()},b.prototype.M0=function(t,i){for(var n=t.length,s=0;s<n;s++)this.removeNode(t[s]);for(var r=i.length,s=0;s<r;s++)this.Q0(i[s])},b.prototype.H0=function(t,i,n){if(!(h=this.V0(t))){var s=[],r=this.J0(i);r||(r=this.K0(i),s.push(i));i=this.J0(n);i||(i=this.K0(n),s.push(n));var h=this.W0(t,r,i);return r.X0(h,!0),i.X0(h,!1),s}},b.prototype.Q0=function(t){var i,n=this.V0(t);n&&(i=n.srcRelNode,t=n.tarRelNode,i=i.Y0(n,!0),t=t.Y0(n,!1),i&&t||this.reportError("There is issue for relation's source and target node."),n.clear(),
o.removeItemInList(n,this.allRelEdgeItems))},b.prototype.removeNode=function(t){var i=this.J0(t);if(i){for(var n=i.T0;0<n.length;)this.Q0(n[0].hostEdge),n=i.T0;for(n=i.outRelEdges;0<n.length;)this.Q0(n[0].hostEdge),n=i.outRelEdges;t=i.hostNode;i.clear(),o.removeItemInList(i,this.u0)}},b.prototype.J0=function(t){return t.y0},b.prototype.V0=function(t){return t.O0},b.prototype.K0=function(t){this.J0(t)&&this.reportError("The input node has created relation item.");t=new e(t,this.reportError);return this.u0.push(t),t},b.prototype.W0=function(t,i,n){this.V0(t)&&this.reportError("The input edge has created relation item.");n=new f(t,i,n,this.reportError);return this.allRelEdgeItems.push(n),n},b.prototype.clear=function(){for(var t=this.u0,i=0,n=t.length;i<n;++i)t[i].clear();for(var s=this.allRelEdgeItems,i=0,n=s.length;i<n;++i)s[i].clear();this.u0=[],this.allRelEdgeItems=[]},b.prototype.Z0=function(t,i){var n=[],t=this.J0(t);if(!t)return n;for(var s=t.w0(i),r=0,h=s.length;r<h;++r)n.push(
s[r].hostNode);return n},e.prototype.X0=function(t,i){i=i?this.outRelEdges:this.T0;-1<i.indexOf(t)?this.reportError("The relation has already exist on node"):i.push(t)},e.prototype.Y0=function(t,i){i=i?this.outRelEdges:this.T0;return o.removeItemInList(t,i)},e.prototype.$0=function(){return this.outRelEdges.length<1&&this.T0.length<1},e.prototype.w0=function(t){var i=this.T0,n="srcRelNode";t&&(i=this.outRelEdges,n="tarRelNode");for(var s=[],r=0,h=i.length;r<h;++r){var o=i[r][n];s.indexOf(o)<0&&s.push(o)}return s},e.prototype.clear=function(){this.hostNode.y0=null,this.hostNode=null},f.prototype.clear=function(){this.hostEdge.O0=null,this.hostEdge=null},a.prototype._0=function(t){t=this.Bv(t);return t?t._0():null},a.prototype.qv=function(t,i,n){for(var s=0,r=t.length;s<r;++s)this.jv(t[s],t,n);for(s=0,r=i.length;s<r;++s)this.Pv(i[s],n);this.Av(this.rootGrpRelation)},a.prototype.jv=function(t,i,n){var s=this.Bv(t);if(s)return s;var r=n.getParentNode(t);r&&i.indexOf(r)<0&&(r=null);var h=(
h=this.Bv(r))||this.jv(r,i,n);return(s=this.Ev(t)).isExpanded=n.isExpanded(t),h.Iv(t,s),s},a.prototype.Pv=function(t,i){var n=i.getSourceNode(t),s=i.getTargetNode(t);if(this.Bv(n)&&this.Bv(s)){if(n!==s&&!this.Uv(n,s)&&!this.Uv(s,n)){i=this.zv(n,s),i=this.Bv(i);return i.Fv(t,n,s),i}}else this.reportError("Edge node is not added yet.")},a.prototype.Ev=function(t){this.x0.va(t)&&this.reportError("The node has been added already.");var i=new m(t,this.reportError);return this.x0.da(t,i),i},a.prototype.getParentNode=function(t){t=this.Bv(t);return t?t.R0:(this.reportError("The node is not added yet."),null)},a.prototype.Bv=function(t){return t?this.x0.va(t):this.rootGrpRelation},a.prototype.zv=function(t,i){if(!t||!i)return null;for(var n=this.getParentNode(t);n;){if(this.Uv(i,n))return n;n=this.getParentNode(n)}return null},a.prototype.Uv=function(t,i){if(t===i)return!1;if(!i)return!0;for(var n=this.getParentNode(t);n;){if(n===i)return!0;n=this.getParentNode(n)}return!1},
a.prototype.Gv=function(t,i){for(var n=i,s=this.getParentNode(n);t!==s&&s;)n=s,s=this.getParentNode(n);return t!==s?(this.reportError("Top node is not found in group."),null):n},a.prototype.Av=function(t){if(!(t.Jv()<1)){var i=t.hostNode,n=t.B0,s=t.co,r=t.S0,h=t.L0;t.relationTreeObj&&this.reportError("Relation tree has been created");for(var h=this.Kv(i,n,s,r,h),o=(t.relationTreeObj=h).a0,e=t.q0,u=0,f=e.length;u<f;++u){var a=e[u];a.isExpanded&&(a.Jv()<1||(a=this.Av(a),o.push(a)))}return h}},a.prototype.Kv=function(t,i,n,s,r){for(var h=[],o=[],e=0,u=n.length;e<u;++e){var f=s[e],a=r[e],f=this.Gv(t,f),a=this.Gv(t,a);h.push(f),o.push(a)}var c=new b(t,this.reportError);return c.G0(i,n,h,o),c},a.prototype.clear=function(){this.rootGrpRelation.clear(!0)},m.prototype.Iv=function(t,i){this.B0.push(t),this.q0.push(i),null!==i.R0&&this.reportError("The child node may be in some group already."),i.R0=this.hostNode},m.prototype.Fv=function(t,i,n){this.co.push(t),this.S0.push(i),this.L0.push(n)},
m.prototype.Qv=function(){return this.hostNode},m.prototype._0=function(){return this.relationTreeObj},m.prototype.Wv=function(){return this.q0},m.prototype.Jv=function(){return this.B0.length},m.prototype.clear=function(t){if(this.relationTreeObj&&this.relationTreeObj.clear(),t)for(var i=this.q0,n=0,s=i.length;n<s;++n)i[n].clear(t)},g.prototype.Hi=function(t,i){this.x=t,this.y=i,this.changeNode.x=t,this.changeNode.y=i},g.prototype.jn=function(t,i){this.w=t,this.h=i,this.changeNode.w=t,this.changeNode.h=i},g.prototype.getX=function(){return this.x},g.prototype.getY=function(){return this.y},g.prototype.getW=function(){return this.w},g.prototype.getH=function(){return this.h},g.prototype.Ln=function(t,i){var n=t-this.getX(),s=i-this.getY();this.Hi(t,i);for(var r=this.getChildNodes(),h=0,o=r.length;h<o;++h){var e=r[h],u=e.x+n,f=e.y+s;e.isGroupNode?e.Ln(u,f):e.Hi(u,f)}},g.prototype.Ni=function(){return this.changeNode},g.prototype.Xv=function(t){this.A0=t},g.prototype.Yv=function(){
return this.A0},g.prototype.getParentNode=function(){var t=null,i=this.Ni().$n;return t=i?i.snakeNode:t},g.prototype.getChildNodes=function(){for(var t=[],i=this.Ni()._n,n=0,s=i?i.length:0;n<s;++n){var r=i[n].snakeNode;t.push(r)}return t},w.prototype.wn=function(t){this.Qi=t,k(this.Qi,this),this.z0=!1},w.prototype.Zv=function(){k(this.Qi,null),this.x=0,this.y=0,this.w=0,this.h=0,this.Qi=[],this.z0=!1},w.prototype.Dn=function(){return this.Qi},w.prototype.Tn=function(){return this.Qi.length},w.prototype.$v=function(t){this.Qi.sort(t)},w.prototype.Mn=function(t){return 0<=this.Qi.indexOf(t)},w.prototype.Hi=function(t,i){this.x=t,this.y=i},w.prototype.jn=function(t,i){this.w=t,this.h=i},w.prototype.Ln=function(t,i){var n=t-this.getX(),s=i-this.getY();this.Hi(t,i);for(var r=this.Qi,h=0,o=r.length;h<o;++h){var e=r[h],u=e.getX()+n,f=e.getY()+s;e.Ln(u,f)}},w.prototype.getX=function(){return this.x},w.prototype.getY=function(){return this.y},w.prototype.getW=function(){
return this.z0||this.updateSize(),this.w},w.prototype.getH=function(){return this.z0||this.updateSize(),this.h},w.prototype.mn=function(t){this.nodeDist=t};var k=function(t,i){for(var n=0,s=t.length;n<s;++n)t[n].Xv(i)};function y(t,i){this.reportError=i,(this.Jh=t)&&(t.E0=this),this.x=0,this.y=0,this.w=0,this.h=0,this.padding={top:0,bottom:0,left:0,right:0},this._v=!0,t&&(this.x=t.getX(),this.y=t.getY(),this.w=t.getW(),this.h=t.getH(),(t=t.padding)&&(this.padding={top:t.top,bottom:t.bottom,left:t.left,right:t.right})),this.sections=[],this.p1=[],this.tb=null,this.relationTreeObj=null,this.ib=!0}function O(t,i,n){this.layoutSessionData=t,this.changeStateObj=i,this.hostInterfaceObj=this.changeStateObj.hostInterfaceObj,this.reportError=n}w.prototype.updateSize=function(){for(var t=this.Qi,i=t.length,n=this.nb(),s=0,r=0,h=0;h<i;h++){var o=t[h],e=o.getH(),o=o.getW();n?(s=o<s?s:o,r+=e):(s+=o,r=e<r?r:e)}n?r+=this.nodeDist.y*(i-1):s+=this.nodeDist.x*(i-1),this.jn(s,r),this.z0=!0},
w.prototype.sb=function(){return this.U0},w.prototype.rb=function(t){this.U0=t},w.prototype.nb=function(){return this.U0===T.LayoutDirection.LeftToRight||this.U0===T.LayoutDirection.RightToLeft},w.prototype.hb=function(){for(var t=this.Dn(),i=this.nodeDist,n=this.nb(),s=this.x,r=this.y,h=0,o=t.length;h<o;++h){var e=t[h];e.Ln(s,r),n?r=r+e.getH()+i.y:s=s+e.getW()+i.x}},y.prototype.clear=function(){this.sections=[],this.ib=!0},y.prototype.ob=function(t){this.sections.push(t),this.ib=!1},y.prototype.eb=function(){return this.sections},y.prototype.ub=function(){return this.sections.length},y.prototype.fb=function(t){return this.sections[t]},y.prototype.Xv=function(t){var i=this.Jh;if(!i)return null;i.Xv(t)},y.prototype.Yv=function(){var t=this.Jh;return t?t.Yv():null},y.prototype.ab=function(){return this.p1},y.prototype.cb=function(t){for(var i=0,n=(this.p1=t).length;i<n;++i)t[i].tb=this},y.prototype.vb=function(){return this.x},y.prototype.lb=function(){return this.y},
y.prototype.getX=function(){return this.ib||this.db(),this.x},y.prototype.getY=function(){return this.ib||this.db(),this.y},y.prototype.getW=function(){return this.ib||this.db(),this.w},y.prototype.getH=function(){return this.ib||this.db(),this.h},y.prototype.Hi=function(t,i){this.x=t,this.y=i,this.Jh&&this.Jh.Hi(t,i)},y.prototype.jn=function(t,i){this.w=t,this.h=i,this.Jh&&this.Jh.jn(t,i)},y.prototype.Ln=function(t,i){var n=t-this.getX(),s=i-this.getY();this.Hi(t,i);for(var r=this.sections,h=0,o=r.length;h<o;++h){var e=r[h],u=e.getX()+n,f=e.getY()+s;e.Ln(u,f)}},y.prototype.db=function(){var t=this.bb(this.sections),i=this.padding,n=t.x-i.left,s=t.y-i.top,r=t.w+i.left+i.right,i=t.h+i.top+i.bottom;this.Hi(n,s),this.jn(r,i),this.ib=!0},y.prototype.bb=function(t){if(t.length<1)return{x:0,y:0,w:0,h:0};for(var i=(e=t[0]).getX(),n=e.getY(),s=i+e.getW(),r=n+e.getH(),h=1,o=t.length;h<o;++h){var e,u=(e=t[h]).getX(),f=e.getY();u<i&&(i=u),f<n&&(n=f),s<(u+=e.getW())&&(s=u),r<(f+=e.getH())&&(r=f)}
return{x:i,y:n,w:s-i,h:r-n}},y.prototype.Ni=function(){var t=this.Jh;return t?t.Ni():null},y.prototype.mb=function(){for(var t=this.padding,i=this.getX()+t.left,n=this.getY()+t.top,s=i+(this.getW()-t.left-t.right)/2,r=n+(this.getH()-t.top-t.bottom)/2,h=this.sections,o=0,e=h.length;o<e;++o){var u=h[o];this.gb(u,s,r);var f=u.sb(),f=this.pb(f);u.rb(f)}},y.prototype.gb=function(t,i,n){var s=t.x,r=t.y,h=s+t.getW()/2,o=r+t.getH()/2;t.nb()?s-=2*(h-i):r-=2*(o-n),t.Ln(s,r)},y.prototype.pb=function(t){var i=t;switch(t){case T.LayoutDirection.LeftToRight:i=T.LayoutDirection.RightToLeft;break;case T.LayoutDirection.RightToLeft:i=T.LayoutDirection.LeftToRight;break;case T.LayoutDirection.TopToBottom:i=T.LayoutDirection.BottomToTop;break;case T.LayoutDirection.BottomToTop:i=T.LayoutDirection.TopToBottom}return i},O.prototype.clear=function(){},O.prototype.wb=function(t,i){var n=this.kb(t),t=this.layoutSessionData.Ft,t=t===T.LayoutDirection.LeftToRight||t===T.LayoutDirection.RightToLeft;this.yb(n,i,t
),this.Tb(n),this.Ob(n)},O.prototype.kb=function(t){for(var i=[],n=t.a0,s=0,r=n.length;s<r;++s){var h=this.kb(n[s]);i.push(h)}t=this.xb(t);return t.cb(i),t},O.prototype.xb=function(t){var i=this.changeStateObj,n=this.layoutSessionData.Ft,s=this.layoutSessionData.nodeDist,r=t.Jh,h=S(r,i);r&&!h&&this.reportError("the snake node is not created yet.");var o=new y(h,this.reportError);o.relationTreeObj=t,h||R(o,i.zh);for(var e=t.D0(),u=e.length,f=0;f<u;f++){var a=e[f],c=a.length;if(0<c){for(var v=new w(n),l=[],d=0;d<c;d++){var b,m=S(a[d].hostNode,i);m.isGroupNode&&m.isExpanded?(b=m.E0)?l.push(b):this.reportError("The section for group is not created yet."):l.push(m)}v.wn(l),v.mn(s),o.ob(v)}}return o},O.prototype.yb=function(t,i,n){void 0===n&&this.reportError("Parameter is undefined");var s=t.padding,r=n?i-s.left-s.right:i-s.top-s.bottom;r<=0&&(r=i);for(var h=t.ab(),o=0,e=h.length;o<e;++o)this.yb(h[o],r,n);this.Rb(t,i,n)},O.prototype.Rb=function(t,i,n){var s=this.layoutSessionData.nodeDist,
r=this.layoutSessionData.Ft,h=t.padding,o=n?i-h.left-h.right:i-h.top-h.bottom;o<=0&&(o=i);var i=t.vb()+h.left,h=t.lb()+h.top,e=n?i:h,u=e+o,f=i,a=h,c=t.ub(),h=0<c?t.fb(0):null;h&&(r===T.LayoutDirection.BottomToTop?a=u-h.getH():r===T.LayoutDirection.RightToLeft&&(f=u-h.getW()));for(var v=0,l=0,d=null,b=r,m=0;m<c;m++){var g=t.fb(m),p=g.getW(),w=g.getH(),k=m<c-1?t.fb(m+1):null,y=k?k.getW():0,k=k?k.getH():0;n?(b===T.LayoutDirection.LeftToRight?u<f+p?(f=u-p,a=a+v+s.y,v=w,b=T.LayoutDirection.RightToLeft,l++):v=w<v?v:w:f<e?(f=e,a=a+v+s.y,v=w,b=T.LayoutDirection.LeftToRight,l++):v=w<v?v:w,g.Ln(f,a),f=b===T.LayoutDirection.RightToLeft?f-y-s.x:f+p+s.x):(b===T.LayoutDirection.TopToBottom?u<a+w?(a=u-w,f=f+v+s.x,v=p,b=T.LayoutDirection.BottomToTop,l++):v=p<v?v:p:a<e?(a=e,f=f+v+s.x,v=p,b=T.LayoutDirection.TopToBottom,l++):v=p<v?v:p,g.Ln(f,a),a=b===T.LayoutDirection.BottomToTop?a-k-s.y:a+w+s.y),g.I0=l,g.preSection=d,g.rb(b),x(g,t.relationTreeObj,this.changeStateObj),g.hb(),d=g}t.ib=!1},
O.prototype.Tb=function(t){var i=this.layoutSessionData.Ft;this.Bb(t,i)%2==1&&t.mb();for(var n=t.ab(),s=0,r=n.length;s<r;++s)this.Tb(n[s])},O.prototype.Bb=function(t,i){t=t.Yv();return!!t&&t.sb()!==i},O.prototype.Ob=function(t){for(var i=t.eb(),n=0,s=i.length;n<s;++n){var r=i[n],h=r.sb(),o=!1,e=r.preSection;e&&(o=e.sb()!==h);for(var u=r.Dn(),f=0,a=u.length;f<a;++f){var c=u[f].Ni();h===T.LayoutDirection.RightToLeft?c.Oi="RL":h===T.LayoutDirection.LeftToRight?c.Oi="LR":h===T.LayoutDirection.BottomToTop?c.Oi="BT":c.Oi="TB"}if(e)for(f=0,a=(u=e.Dn()).length;f<a;++f)(c=u[f].Ni()).isWrapped=o}for(var v=t.ab(),n=0,s=v.length;n<s;++n)this.Ob(v[n])};var x=function(t,i,n){for(var s=t.Dn(),r=0,h=s.length;r<h;++r)s[r].sortNum=r;if(s.length<2)return 0;if(!i)return 0;var o=t.preSection;if(!o)return 0;for(var o=t.I0!==o.I0,e=0,u=[],r=0,h=s.length;r<h;++r){var f=s[r],a=B(f),a=i.Z0(a,!1);0<a.length?(a=S(a[0],n).sortNum,e<(f.sortNum=a)&&(e=a)):u.push(f)}for(var c=o?-1:e+1,r=0,h=u.length;r<h;++r)u[r]=c
;t.$v(function(t,i,n){return i.sortNum>n.sortNum?t?-1:1:i.sortNum<n.sortNum?t?1:-1:0}.bind(null,o));for(r=0,h=s.length;r<h;++r)s[r].sortNum=r},R=function(t,i){t.Hi(i.x,i.y);i=i.padding,t=t.padding;t.top=i.top,t.bottom=i.bottom,t.left=i.left,t.right=i.right},B=function(t){if(!t)return null;t=t.Ni();return t?t.hostNode:null},S=function(t,i){if(!t)return null;t=i.Fi(t);return t?t.snakeNode:null};function L(t){this.reportError=t.reportError,this.hostInterfaceObj=t,this.layoutSessionData=new s,this.changeStateObj=null,this.ho=null,this.Sb=null}L.prototype.setPortSharing=function(t){this.layoutSessionData.Bu=t},L.prototype.setWrapLength=function(t){this.layoutSessionData.Oh=t},L.prototype.setGraphOrigin=function(t,i){var n=this.layoutSessionData.ic;n.x=t,n.y=i},L.prototype.setPadding=function(t,i,n,s){var r=this.layoutSessionData.padding;r.top=t,r.bottom=i,r.left=n,r.right=s},L.prototype.doLayout=function(t,i){this.changeStateObj&&this.reportError(
"The internal data may be not cleared in previous layout.");var n=this.layoutSessionData;q(n,this.hostInterfaceObj);var s=new h(this.hostInterfaceObj,n,t,i);this.changeStateObj=s,this.Lb(),this.ho=new r(n,s,this.qb),this.Sb=this.jb(t,i);i=this.Sb._0(null);j(s.nList,this.reportError),this.V(i),this.clear()},L.prototype.clear=function(){this.changeStateObj&&this.changeStateObj.xi(),this.qb&&this.qb.clear(),this.Sb&&this.Sb.clear(),this.changeStateObj=null,this.qb=null,this.Sb=null,this.ho=null};var q=function(t,i){t.Ft=i.getLayoutDirection(),t.nodeDist=i.getNodeToNodeDist(),t.edgeDist=i.getEdgeToEdgeDist(),t.minSegmentLength=i.getMinSegmentLength(),t.at=i.getIncUpdatePathType(),t.isRSOPEnabled=i.isRSOPEnabled(),t.Vo=!1};L.prototype.jb=function(t,i){var n=new a(this.reportError);return n.qv(t,i,this.hostInterfaceObj),n},L.prototype.V=function(t){this.Pb(t),this.changeStateObj.Uo("sideOffset"),this.changeStateObj.ko(),this.changeStateObj.Oo(),this.ho.xo(),this.changeStateObj.Yo()
;t=this.Nb(this.layoutSessionData.Bu);this.ho.Iu("equalSpacedOnOneSide",t.shareIn,t.shareOut),this.ho.Vu(),this.ho.So(),this.U()},L.prototype.Pb=function(t){this.qb&&this.reportError("Snake operator has already exist.");var i=this.layoutSessionData;this.qb=new O(i,this.changeStateObj,this.reportError),this.qb.wb(t,i.Oh)},L.prototype.U=function(){var t=this.changeStateObj,i=this.layoutSessionData;try{new n(i,t,null,i.isRSOPEnabled)}catch(t){this.reportError(t)}t.update(1)},L.prototype.Lb=function(){var t=this.layoutSessionData,i=this.changeStateObj.zh;i.x=t.ic.x,i.y=t.ic.y;t=t.padding;i.padding={top:t.top,bottom:t.bottom,left:t.left,right:t.right}},L.prototype.Nb=function(t){var i=!1,n=!1;switch(t){case"none":break;case"inOnly":i=!0;break;case"outOnly":n=!0;break;case"inAndOut":n=i=!0;break;default:this.reportError("Unknown port sharing option: "+t)}return{shareIn:i,shareOut:n}},L.prototype.reportError=function(t){this.hostInterfaceObj.reportError(t)};var j=function(t,i){for(var n=[],
s=0,r=t.length;s<r;++s){var h=t[s];h.snakeNode&&i("The snake node has already created");h=new g(h,i);n.push(h)}return n};t.common.ObjectHelper.rootNamespace=t.common.ObjectHelper.rootNamespace||{};i=t.common.ObjectHelper.rootNamespace;i.Layout=i.Layout||{},i.Layout.SnakeLayout=L;t={};return t.Layout=i.Layout||{},t.Layout.SnakeLayout=L,t},"object"==typeof exports&&"undefined"!=typeof module?module.exports=n(require("@diagramming/layoutcore"),require("@diagramming/core"),require("@diagramming/astar")):"function"==typeof define&&define.amd?define(["@diagramming/layoutcore","@diagramming/core","@diagramming/astar"],n):((t=t||self).diagramfoundation=t.diagramfoundation||{},t.diagramfoundation.snakelayout=n(t.diagramfoundation.core,t.diagramfoundation.layoutcore,t.diagramfoundation.astar));