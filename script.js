const definitions = new Map();
const globalDefinitionsByConstructor = new WeakMap();
const nativeRegistry = window.customElements;
const NativeHTMLElement = window.HTMLElement;
let upgradeInstance;

/** Web Component that is initially rendered instead of DisplayElement */
class StandInElement extends HTMLElement {
  constructor(newTagName) {
    super();
    this.newTagName = newTagName;
  }

  connectedCallback() {
    // definition should be get from registry of root node
    // if root node does not contain registy, traverse up to next root
    // if document is reached, use element from global definition
    const definition = definitions.get(this.newTagName);
    console.log('original tag name:', this.newTagName);
    console.log('definition:', definition);
    console.log('root node:', this.getRootNode());

    // customize instance to custom element
    if (definition) {
      try {
        new definition.elementClass();
      } catch {
        patchHTMLElement(definition.elementClass);
        new definition.elementClass();
      }

      if (definition.connectedCallback && this.isConnected) {
        definition.connectedCallback.call(this);
      }
    }
  }
}
window.customElements.define('stand-in-element', StandInElement);

// Helper to patch CE class hierarchy changing those CE classes created before applying the polyfill
// to make them work with the new patched CustomElementsRegistry
const patchHTMLElement = (elementClass) => {
  const parentClass = Object.getPrototypeOf(elementClass);

  if (parentClass !== window.HTMLElement) {
    if (parentClass === NativeHTMLElement) {
      return Object.setPrototypeOf(elementClass, window.HTMLElement);
    }

    return patchHTMLElement(parentClass);
  }
};

window.HTMLElement = function HTMLElement() {
  let instance = upgradeInstance;
  if (instance) {
    upgradeInstance = undefined;
    return instance;
  }

  instance = Reflect.construct(NativeHTMLElement, [], StandInElement);
  Object.setPrototypeOf(instance, this.constructor.prototype);

  return instance;
};
window.HTMLElement.prototype = NativeHTMLElement.prototype;

window.CustomElementRegistry = class {
  constructor() {}

  define(tagName, elementClass) {
    tagName = tagName.toLowerCase();

    const definition = {
      elementClass,
      connectedCallback: elementClass.prototype.connectedCallback,
      disconnectedCallback: elementClass.prototype.disconnectedCallback,
      adoptedCallback: elementClass.prototype.adoptedCallback,
      attributeChangedCallback: elementClass.prototype.attributeChangedCallback,
      formAssociated: elementClass['formAssociated'],
      formAssociatedCallback: elementClass.prototype['formAssociatedCallback'],
      formDisabledCallback: elementClass.prototype['formDisabledCallback'],
      formResetCallback: elementClass.prototype['formResetCallback'],
      formStateRestoreCallback:
        elementClass.prototype['formStateRestoreCallback'],
      observedAttributes: [],
    };

    definitions.set(tagName, definition);

    // only set if it is the global registry -> could be determined by attribute of class
    globalDefinitionsByConstructor.set(elementClass, definition);

    const standInElement = new StandInElement();

    if (!nativeRegistry.get(tagName)) {
      nativeRegistry.define(
        tagName,
        class extends StandInElement {
          constructor() {
            super(tagName);
          }
        }
      );
    }

    return standInElement;
  }
};

/** Web Component that should be rendered through StandInElement*/
class DisplayElement extends HTMLElement {
  connectedCallback() {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = 'Hello Display Element';

    this.appendChild(wrapper);
  }
}

const scopedRegistry = new CustomElementRegistry();
scopedRegistry.define('display-element', DisplayElement);

const wrapper = document.createElement('div');
const shadowRoot = wrapper.attachShadow({ mode: 'open' });

const diplayElement2 = document.createElement('display-element');
shadowRoot.append(diplayElement2);

const displayElement3 = document.createElement('display-element');

document.body.appendChild(wrapper);
document.body.appendChild(displayElement3);

// this cannot be done, as scopedRegistry.define() calls native registry
// provide a window.globalRegistry to define global custom elements?
try {
  window.customElements.define('display-element', DisplayElement);
} catch (error) {
  console.log(error);
}
