var search = webpackJsonp_name_([ 0 ], [ function(e, r) {
"use strict";
r.init = function() {
function e() {
n.getBoundingClientRect().top <= o ? (r.classList.contains("search-form_hidden") && (t.value = n.value), 
r.classList.remove("search-form_hidden")) : (r.classList.contains("search-form_hidden") || (n.value = t.value), 
r.classList.add("search-form_hidden"));
}
var r = document.querySelector(".search-form_fixed"), t = r.querySelector(".search-form__query .text-input__control"), n = document.querySelector(".search-form:not(.search-form_fixed) .search-form__query .text-input__control"), o = parseInt(getComputedStyle(r, "").paddingTop);
window.addEventListener("scroll", e), e();
};
} ]);
//# sourceMappingURL=search.79ee647d9b2a0ed2cf08.js.map