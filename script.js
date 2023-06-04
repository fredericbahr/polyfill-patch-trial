const definitions = new Map();
const nativeRegistry = window.customElements;

/** Web Component that is initially rendered instead of DisplayElement */
class StandInElement extends HTMLElement {
  constructor(tagName) {
    super();

    console.log('original tag name', tagName);
    console.log('definition', definitions.get(tagName));

    const displayElement = document.createElement('display-element');
    console.log('connected Callback of Stand In Element');

    //this.replaceWith(displayElement);
  }
}
window.customElements.define('stand-in-element', StandInElement);

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

    const standInElement = new StandInElement();

    nativeRegistry.define(
      tagName,
      class extends StandInElement {
        constructor() {
          super(tagName);
        }
      }
    );

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
