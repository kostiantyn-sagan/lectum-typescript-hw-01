type defaultsTypes = {
  symbol: string;
  separator: string;
  decimal: string;
  formatWithSymbol: boolean;
  errorOnInvalid: boolean;
  precision: number;
  pattern: string;
  negativePattern: string;
  increment?: number;
  groups?: RegExp;
  useVedic?: boolean;
};

const defaults: defaultsTypes = {
  symbol: '$',
  separator: ',',
  decimal: '.',
  formatWithSymbol: false,
  errorOnInvalid: false,
  precision: 2,
  pattern: '!#',
  negativePattern: '-!#',
};
const round: (v: number) => number = (v: number) => Math.round(v);
const pow: (p: number) => number = (p: number) => Math.pow(10, p);
const rounding: (value: number, increment: number) => number = (
  value: number,
  increment: number,
) => round(value / increment) * increment;

/**
 * Create a new instance of currency.js
 * @param {number|string|currency} value
 * @param {object} [opts]
 */

export default class Currency {
  intValue: number | undefined;
  value: number | undefined;
  _settings: defaultsTypes | undefined;
  _precision: number | undefined;
  groupRegex: RegExp = /(\d)(?=(\d{3})+\b)/g;
  vedicRegex: RegExp = /(\d)(?=(\d\d)+\d\b)/g;

  constructor(
    value: number | string | Currency,
    opts?: Partial<defaultsTypes>,
  ) {
    if (!(this instanceof Currency)) {
      return new Currency(value, opts);
    }

    let settings = Object.assign({}, defaults, opts);
    let precision = pow(settings.precision);
    let v = this.parse(value, settings);

    this.intValue = v;
    this.value = v / precision;

    // Set default incremental value
    settings.increment = settings.increment || 1 / precision;

    // Support vedic numbering systems
    // see: https://en.wikipedia.org/wiki/Indian_numbering_system
    if (settings.useVedic) {
      settings.groups = this.vedicRegex;
    } else {
      settings.groups = this.groupRegex;
    }

    // Intended for internal usage only - subject to change
    this._settings = settings;
    this._precision = precision;
  }

  parse(
    value: number | string | Currency,
    opts: defaultsTypes,
    useRounding = true,
  ) {
    let v = 0;
    let { decimal, errorOnInvalid, precision: decimals } = opts;
    let precision: number = pow(decimals);

    if (value instanceof Currency) {
      v = Number(value.value) * precision;
    } else if (typeof value === 'number') {
      v = value * precision;
    } else if (typeof value === 'string') {
      let regex = new RegExp('[^-\\d' + decimal + ']', 'g'),
        decimalString = new RegExp('\\' + decimal, 'g');
      const replacedValue = value
        .replace(/\((.*)\)/, '-$1')
        .replace(regex, '')
        .replace(decimalString, '.');

      v = Number(replacedValue) * precision;
      v = v || 0;
    } else {
      if (errorOnInvalid) {
        throw Error('Invalid Input');
      }
      v = 0;
    }

    // Handle additional decimal for proper rounding.
    v = Number(v.toFixed(4));

    return useRounding ? round(v) : v;
  }

  /**
   * Adds values together.
   * @param {number} number
   * @returns {currency}
   */
  add(number: number) {
    let { intValue, _settings, _precision } = this;

    if (intValue && _settings && _precision) {
      return new Currency(
        (intValue += this.parse(number, _settings)) / _precision,
        _settings,
      );
    }

    return new Currency(
      this.parse(number, defaults) / defaults.precision,
      _settings,
    );
  }

  /**
   * Subtracts value.
   * @param {number} number
   * @returns {currency}
   */
  subtract(number: number) {
    let { intValue, _settings, _precision } = this;

    if (intValue && _settings && _precision) {
      return new Currency(
        (intValue -= this.parse(number, _settings)) / _precision,
        _settings,
      );
    }

    return new Currency(
      this.parse(number, defaults) / defaults.precision,
      _settings,
    );
  }

  /**
   * Multiplies values.
   * @param {number} number
   * @returns {currency}
   */
  multiply(number: number) {
    let { intValue, _settings } = this;

    if (intValue && _settings) {
      return new Currency(
        (intValue *= number) / pow(_settings.precision),
        _settings,
      );
    }
  }

  /**
   * Divides value.
   * @param {number} number
   * @returns {currency}
   */
  divide(number: number) {
    let { intValue, _settings } = this;

    if (intValue && _settings) {
      return new Currency(
        (intValue /= this.parse(number, _settings, false)),
        _settings,
      );
    }
  }

  /**
   * Takes the currency amount and distributes the values evenly. Any extra pennies
   * left over from the distribution will be stacked onto the first set of entries.
   * @param {number} count
   * @returns {array}
   */
  distribute(count: number) {
    let { intValue, _precision, _settings } = this;
    let distribution = [];

    if (intValue && _precision) {
      let split = Math[intValue >= 0 ? 'floor' : 'ceil'](intValue / count);
      let pennies = Math.abs(intValue - split * count);

      for (; count !== 0; count--) {
        let item = new Currency(split / _precision, _settings);

        // Add any left over pennies
        pennies-- > 0 &&
          (item =
            intValue >= 0
              ? item.add(1 / _precision)
              : item.subtract(1 / _precision));

        distribution.push(item);
      }

      return distribution;
    }
  }

  /**
   * Returns the dollar value.
   * @returns {number}
   */
  dollars() {
    if (this.value) {
      return ~~this.value;
    }
  }

  /**
   * Returns the cent value.
   * @returns {number}
   */
  cents() {
    let { intValue, _precision } = this;

    if (intValue && _precision) {
      return ~~(intValue % _precision);
    }
  }

  /**
   * Formats the value as a string according to the formatting settings.
   * @param {boolean} useSymbol - format with currency symbol
   * @returns {string}
   */
  format(useSymbol: boolean) {
    let {
      pattern,
      negativePattern,
      formatWithSymbol,
      symbol,
      separator,
      decimal,
      groups,
    } = this._settings ? this._settings : defaults;
    let values = (this + '').replace(/^-/, '').split('.');
    let dollars = values[0];
    let cents = values[1];

    // set symbol formatting
    typeof useSymbol === 'undefined' && (useSymbol = formatWithSymbol);

    if (this.value && groups) {
      return (this.value >= 0 ? pattern : negativePattern)
        .replace('!', useSymbol ? symbol : '')
        .replace(
          '#',
          `${dollars.replace(groups, '$1' + separator)}${
            cents ? decimal + cents : ''
          }`,
        );
    }
  }

  /**
   * Formats the value as a string according to the formatting settings.
   * @returns {string}
   */
  toString() {
    let { intValue, _precision, _settings } = this;

    if (intValue && _settings?.increment && _precision) {
      return rounding(intValue / _precision, _settings.increment).toFixed(
        _settings.precision,
      );
    }
  }

  /**
   * Value for JSON serialization.
   * @returns {float}
   */
  toJSON() {
    return this.value;
  }
}
