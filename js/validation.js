// =========================================
// AI Trip Planner - Shared Form Validation
// =========================================

(function (window) {
  const ERROR_CLASS = 'field-error';
  const INPUT_ERROR_CLASS = 'input-error';
  const GROUP_ERROR_CLASS = 'has-error';
  const SHAKE_CLASS = 'validation-shake';
  const STATUS_CLASS = 'form-status';

  function getFieldGroup(field) {
    return field.closest('.input-group, .form-group') || field.parentElement || field;
  }

  function getFieldAnchor(field) {
    return field.closest('.input-with-icon') || field;
  }

  function triggerShake(element) {
    if (!element) return;
    element.classList.remove(SHAKE_CLASS);
    void element.offsetWidth;
    element.classList.add(SHAKE_CLASS);

    element.addEventListener(
      'animationend',
      () => {
        element.classList.remove(SHAKE_CLASS);
      },
      { once: true },
    );
  }

  function ensureErrorElement(field) {
    if (field._inlineErrorElement && field._inlineErrorElement.isConnected) {
      return field._inlineErrorElement;
    }

    const presetErrorElement = field.id ? document.getElementById(`${field.id}Error`) : null;
    if (presetErrorElement) {
      field._inlineErrorElement = presetErrorElement;
      return presetErrorElement;
    }

    const errorElement = document.createElement('div');
    errorElement.className = ERROR_CLASS;
    errorElement.setAttribute('aria-live', 'polite');

    const anchor = getFieldAnchor(field);
    anchor.insertAdjacentElement('afterend', errorElement);

    field._inlineErrorElement = errorElement;
    return errorElement;
  }

  function clearFieldError(field) {
    if (!field) return;

    const group = getFieldGroup(field);
    const anchor = getFieldAnchor(field);

    field.classList.remove(INPUT_ERROR_CLASS);
    field.removeAttribute('aria-invalid');
    group.classList.remove(GROUP_ERROR_CLASS);
    anchor.classList.remove(GROUP_ERROR_CLASS);

    if (field._inlineErrorElement) {
      if (field._inlineErrorElement.id === `${field.id}Error`) {
        field._inlineErrorElement.hidden = true;
        field._inlineErrorElement.textContent = '';
      } else {
        field._inlineErrorElement.remove();
      }
      field._inlineErrorElement = null;
    }
  }

  function showFieldError(field, message) {
    if (!field) return false;

    const group = getFieldGroup(field);
    const anchor = getFieldAnchor(field);
    const errorElement = ensureErrorElement(field);

    field.classList.add(INPUT_ERROR_CLASS);
    field.setAttribute('aria-invalid', 'true');
    group.classList.add(GROUP_ERROR_CLASS);
    anchor.classList.add(GROUP_ERROR_CLASS);

    errorElement.textContent = message;
    errorElement.hidden = false;
    triggerShake(anchor);
    return false;
  }

  function ensureStatusElement(form) {
    let statusElement = form.querySelector(`.${STATUS_CLASS}`);
    if (statusElement) return statusElement;

    statusElement = document.createElement('div');
    statusElement.className = STATUS_CLASS;
    statusElement.setAttribute('aria-live', 'polite');
    statusElement.hidden = true;
    form.appendChild(statusElement);
    return statusElement;
  }

  function showFormStatus(form, message, type = 'error') {
    if (!form) return;

    const statusElement = ensureStatusElement(form);
    statusElement.className = `${STATUS_CLASS} ${type}`;
    statusElement.textContent = message;
    statusElement.hidden = false;
  }

  function clearFormStatus(form) {
    if (!form) return;

    const statusElement = form.querySelector(`.${STATUS_CLASS}`);
    if (!statusElement) return;

    statusElement.textContent = '';
    statusElement.hidden = true;
    statusElement.className = STATUS_CLASS;
  }

  function clearFormErrors(form) {
    if (!form) return;

    form.querySelectorAll('input, textarea, select').forEach(clearFieldError);
    clearFormStatus(form);
  }

  function bindLiveValidation(form) {
    if (!form || form.dataset.inlineValidationBound === 'true') return;

    form.dataset.inlineValidationBound = 'true';
    form.addEventListener('input', (event) => {
      if (!event.target.matches('input, textarea, select')) return;
      clearFieldError(event.target);
      clearFormStatus(form);
    });
    form.addEventListener('change', (event) => {
      if (!event.target.matches('input, textarea, select')) return;
      clearFieldError(event.target);
      clearFormStatus(form);
    });
  }

  function validateRequiredField(field, label) {
    const value = String(field?.value || '').trim();
    if (!value) {
      return showFieldError(field, `${label} is required.`);
    }
    clearFieldError(field);
    return true;
  }

  function validateEmailField(field, label = 'Email') {
    const value = String(field?.value || '').trim();
    if (!value) {
      return showFieldError(field, `${label} is required.`);
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(value)) {
      return showFieldError(field, 'Please enter a valid email address.');
    }

    clearFieldError(field);
    return true;
  }

  function validatePasswordField(field, options = {}) {
    const minLength = Number(options.minLength || 8);
    const value = String(field?.value || '');

    if (!value.trim()) {
      return showFieldError(field, 'Password is required.');
    }

    if (value.length < minLength) {
      return showFieldError(field, `Password must be at least ${minLength} characters.`);
    }

    clearFieldError(field);
    return true;
  }

  function validatePhoneField(field) {
    const value = String(field?.value || '').trim();
    if (!value) {
      return showFieldError(field, 'Phone number is required.');
    }

    const digits = value.replace(/\D/g, '');
    const phonePattern = /^[+()\-\s\d]{7,20}$/;
    if (!phonePattern.test(value) || digits.length < 7 || digits.length > 15) {
      return showFieldError(field, 'Please enter a valid phone number.');
    }

    clearFieldError(field);
    return true;
  }

  function validateIntegerField(field, options = {}) {
    const label = options.label || 'This field';
    const rawValue = String(field?.value || '').trim();
    const min = options.min;
    const max = options.max;

    if (!rawValue) {
      return showFieldError(field, `${label} is required.`);
    }

    if (!/^-?\d+$/.test(rawValue)) {
      return showFieldError(field, `${label} must be a whole number.`);
    }

    const value = Number(rawValue);

    if (typeof min === 'number' && value < min) {
      return showFieldError(field, `${label} must be at least ${min}.`);
    }

    if (typeof max === 'number' && value > max) {
      return showFieldError(field, `${label} must be at most ${max}.`);
    }

    clearFieldError(field);
    return true;
  }

  function focusFirstInvalidField(form) {
    if (!form) return;

    const firstInvalid = form.querySelector(`.${INPUT_ERROR_CLASS}, [aria-invalid="true"]`);
    if (firstInvalid && typeof firstInvalid.focus === 'function') {
      firstInvalid.focus({ preventScroll: false });
    }
  }

  window.FormValidation = {
    bindLiveValidation,
    clearFieldError,
    clearFormErrors,
    clearFormStatus,
    focusFirstInvalidField,
    showFieldError,
    showFormStatus,
    validateEmailField,
    validateIntegerField,
    validatePasswordField,
    validatePhoneField,
    validateRequiredField,
  };
})(window);
