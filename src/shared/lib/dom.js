export function escapeHtml(str) {
  var div = document.createElement("div");
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

export function qs(selector, root) {
  root = root || document;
  return root.querySelector(selector);
}

export function qsa(selector, root) {
  root = root || document;
  return Array.prototype.slice.call(root.querySelectorAll(selector));
}

export function showToast(message) {
  var toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.style.display = "block";
  toast.classList.add("visible");
  setTimeout(function () {
    toast.style.display = "none";
    toast.classList.remove("visible");
  }, 2000);
}
