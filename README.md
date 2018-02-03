# Typereact

[![CircleCI](https://circleci.com/gh/visusnet/typereact.svg?style=shield&circle-token=80ba425931ad61cde5a4ad991aea29aa65c51a30)](https://circleci.com/gh/visusnet/typereact) [![Travis](https://travis-ci.org/visusnet/typereact.svg?branch=master)](https://travis-ci.org/visusnet/typereact) [![npm version](https://badge.fury.io/js/typereact.svg)](https://badge.fury.io/js/typereact) [![Coverage Status](https://coveralls.io/repos/github/visusnet/typereact/badge.svg?branch=master)](https://coveralls.io/github/visusnet/typereact?branch=master)

Typereact is a simple React typeahead component that supports grouped entries.

## Demo

You can find a demo here: https://visusnet.github.io/typereact/

## Install

With npm:
```bash
npm i typereact
```
Or with yarn:
```bash
yarn add typereact
```

## Usage

````javascript
import Typeahead from 'typereact';

const handleBlur = (fieldName, value) => {
    console.log(`Field ${fieldName} set to ${value}.`)
};

<Typeahead options={options} onBlur={handleBlur} />
````

## Configuration

| Prop                   | Required  | Default         | Description                                                                                                  |
| ---------------------- | --------- | --------------- | ------------------------------------------------------------------------------------------------------------ |
| allowUnknownValue      | ``false`` | ``false``       | If true, arbitrary values can be typed.                                                                      |
| autoSelectSingleOption | ``false`` | ``false``       | If true, the component will automatically select an option if there are no other options available.          |
| groups                 | ``false`` | ``undefined``   | If supplied, options will be grouped according to these groups.                                              |
| id                     | ``false`` | ``undefined``   | Sets the HTML input ID.                                                                                      |
| isClearable            | ``false`` | ``false``       | Renders a button that unsets the selected value if set to true.                                              |
| isDisabled             | ``false`` | ``false``       | If true, the component is disabled.                                                                          |
| onBlur                 | ``false`` | no op           | A callback that is called when focus is lost. Parameters: ``fieldName``, ``value``.                          |
| onChange               | ``false`` | no op           | A callback that is called when the value has changed. Parameters: ``fieldName``, ``value``.                  |
| options                | ``false`` | ``[]``          | An array of label-value-pairs.                                                                               |
| placeholder            | ``false`` | ``''``          | Sets the HTML placeholder attribute.                                                                         |
| renderEmptyGroups      | ``false`` | ``false``       | If true, groups will be rendered even if they don't have any options. Works only in conjunction with groups. |
| value                  | ``false`` | ``undefined``   | If set, selects the option with the specified value.                                                         |

### Options

``options`` must be an array with objects containing a ``label`` and a ``value``, e.g.

```javascript
{
  label: 'This will be shown',
  value: 'this is the value'
}
```

### Groups

If you want your options to be grouped, you can set the ``groups`` prop which has the same structure as the ``options`` prop. In order to assign options to a group, you have to add an additional ``group`` property to the options.

Example:
```javascript
const options = [
    {label: 'First option in Group 1', value: 'firstOfGroup1', group: 'group1'},
    {label: 'Second option in Group 1', value: 'secondOfGroup1', group: 'group1'},
    {label: 'First option in Group 2', value: 'firstOfGroup2', group: 'group2'},
    {label: 'Second option in Group 2', value: 'secondOfGroup2', group: 'group2'}
];

const groups = [
    {label: 'Group 1', value: 'group1'},
    {label: 'Group 2', value: 'group2'}
];
```

## Styling

You can apply your own styling or use [the example](https://github.com/visusnet/typereact/blob/gh-pages-source/src/Typeahead.scss) that is used by the demo page.

## License

MIT
