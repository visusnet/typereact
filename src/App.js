import React, {Component} from 'react';
import './App.css';
import Typeahead from 'typereact';
import './Typeahead.css';

const groups = [
    {label: 'Group 1', value: 'group1'},
    {label: 'Group 2', value: 'group2'},
    {label: 'Group 3', value: 'group3'},
    {label: 'Empty Group', value: 'group4'}
];
const options = [
    {label: 'First Label', value: 'value1', group: 'group1'},
    {label: 'Second Label', value: 'value2', group: 'group2'},
    {label: 'Third Label', value: 'value3', group: 'group3'},
    {label: 'Fourth Label', value: 'value4', group: 'group1'},
    {label: 'Fifth Label', value: 'value5', group: 'group2'},
    {label: 'Sixth Label', value: 'value6', group: 'group3'},
    {label: 'Seventh Label', value: 'value7', group: 'group1'}
];
const longOptions = [
    {
        label: 'Very very very very very very very very very very very very very long label',
        value: 'long',
        group: 'group1'
    },
    ...options
];

const OPTION_COUNT = 10000;
const GROUP_COUNT = OPTION_COUNT / 100;
const manyOptions = generateOptions(OPTION_COUNT, GROUP_COUNT);
const manyGroups = generateGroups(GROUP_COUNT);

function estimateMenuWidth(rows: Row[]): Optional<number> {
    const row = rows.reduce((longestRow, row) => {
        if (!longestRow || !longestRow.option) {
            return row;
        }
        return row.option && row.option.label.length > longestRow.option.label.length
            ? row
            : longestRow;
    }, undefined);
    return row && row.option
        ? Math.ceil(row.option.label.length * 10)
        : undefined;
}

class App extends Component {
    render() {
        let fieldNameIndex = 1;
        const fieldName = () => `fieldName${fieldNameIndex++}`;

        return (
            <div style={{display: 'flex'}}>
                <div style={{display: 'block', margin: '30px', width: '300px'}}>
                    <h1>Normal</h1>
                    <h2>Default</h2>
                    <Typeahead fieldName={fieldName()} options={options}/>
                    <h2>menuWidth = 800</h2>
                    <Typeahead fieldName={fieldName()} options={longOptions} menuWidth={800}/>
                    <h2>estimateMenuWidth = true</h2>
                    <Typeahead fieldName={fieldName()} options={longOptions} estimateMenuWidth/>
                    <h2>estimateMenuWidth = custom</h2>
                    <Typeahead fieldName={fieldName()} options={longOptions} estimateMenuWidth={estimateMenuWidth}/>
                    <div style={{height: '86px'}}></div>
                    <h2>allowUnknownValue = true</h2>
                    <Typeahead fieldName={fieldName()} options={options} allowUnknownValue/>
                    <h2>isClearable = true</h2>
                    <Typeahead fieldName={fieldName()} options={options} isClearable/>
                    <h2>allowUnknownValue = true, isClearable = true</h2>
                    <Typeahead fieldName={fieldName()} options={options} allowUnknownValue isClearable/>
                    <h2>autoSelectSingleOption = true</h2>
                    <Typeahead fieldName={fieldName()} options={[options[0]]} autoSelectSingleOption/>
                    <h2>Many Options</h2>
                    <Typeahead fieldName={fieldName()} options={manyOptions}/>
                    <h2>Many Options, minTypedCharacters = 3</h2>
                    <Typeahead fieldName={fieldName()} options={manyOptions} minTypedCharacters={3}/>
                    <h2>Many Options, minTypedCharacters = 3, isClearable = true</h2>
                    <Typeahead fieldName={fieldName()} options={manyOptions} minTypedCharacters={3} isClearable/>
                    <h2>Many Options, estimateMenuWidth = true</h2>
                    <Typeahead fieldName={fieldName()} options={manyOptions} estimateMenuWidth/>
                </div>
                <div style={{display: 'block', margin: '30px', width: '300px'}}>
                    <h1>Grouped</h1>
                    <h2>Default</h2>
                    <Typeahead fieldName={fieldName()} options={options} groups={groups}/>
                    <h2>menuWidth = 800</h2>
                    <Typeahead fieldName={fieldName()} options={longOptions} groups={groups} menuWidth={800}/>
                    <h2>estimateMenuWidth = true</h2>
                    <Typeahead fieldName={fieldName()} options={longOptions} groups={groups} estimateMenuWidth/>
                    <h2>estimateMenuWidth = custom</h2>
                    <Typeahead fieldName={fieldName()} options={longOptions} grouos={groups}
                        estimateMenuWidth={estimateMenuWidth}/>
                    <h2>renderEmptyGroups = true</h2>
                    <Typeahead fieldName={fieldName()} options={options} groups={groups} renderEmptyGroups/>
                    <h2>allowUnknownValue = true</h2>
                    <Typeahead fieldName={fieldName()} options={options} groups={groups} allowUnknownValue/>
                    <h2>isClearable = true</h2>
                    <Typeahead fieldName={fieldName()} options={options} groups={groups} isClearable/>
                    <h2>allowUnknownValue = true, isClearable = true</h2>
                    <Typeahead fieldName={fieldName()} options={options} groups={groups} allowUnknownValue
                        isClearable/>
                    <h2>autoSelectSingleOption = true</h2>
                    <Typeahead fieldName={fieldName()} options={[options[0]]} groups={groups}
                        autoSelectSingleOption/>
                    <h2>Many Options</h2>
                    <Typeahead fieldName={fieldName()} options={manyOptions} groups={manyGroups}/>
                    <h2>Many Options, minTypedCharacters = 3</h2>
                    <Typeahead fieldName={fieldName()} options={manyOptions} groups={manyGroups}
                        minTypedCharacters={3}/>
                    <h2>Many Options, minTypedCharacters = 3, isClearable = true</h2>
                    <Typeahead fieldName={fieldName()} options={manyOptions} groups={manyGroups}
                        minTypedCharacters={3} isClearable/>
                    <h2>Many Options, estimateMenuWidth = true</h2>
                    <Typeahead fieldName={fieldName()} options={manyOptions} groups={manyGroups} estimateMenuWidth/>
                </div>
            </div>
        );
    }
}

function generateGroups(groupCount) {
    const generatedGroups = [];
    for (let groupIndex = 1; groupIndex <= groupCount; groupIndex++) {
        generatedGroups.push({label: `Group ${groupIndex}`, value: `group${groupIndex}`});
    }
    return generatedGroups;
}

function generateOptions(optionCount, groupCount) {
    const generatedOptions = [];
    for (let optionIndex = 1; optionIndex <= optionCount; optionIndex++) {
        generatedOptions.push({
            label: `Label ${optionIndex}`,
            value: `value${optionIndex}`,
            group: `group${((optionIndex - 1) % groupCount) + 1}`
        });
    }
    return generatedOptions;
}

export default App;
