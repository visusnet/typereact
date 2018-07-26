import React, {Component} from 'react';
import './App.css';
import Typeahead from 'typereact';
import './Typeahead.css';

class App extends Component {
    render() {
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
        const OPTION_COUNT = 10000;
        const GROUP_COUNT = OPTION_COUNT / 100;
        const generateGroups = () => {
            const generatedGroups = [];
            for (let groupIndex = 1; groupIndex <= GROUP_COUNT; groupIndex++) {
                generatedGroups.push({label: `Group ${groupIndex}`, value: `group${groupIndex}`});
            }
            return generatedGroups;
        };
        const generateOptions = () => {
            const generatedOptions = [];
            for (let optionIndex = 1; optionIndex <= OPTION_COUNT; optionIndex++) {
                generatedOptions.push({
                    label: `Label ${optionIndex}`,
                    value: `value${optionIndex}`,
                    group: `group${((optionIndex - 1) % GROUP_COUNT) + 1}`
                });
            }
            return generatedOptions;
        };
        return (
            <div style={{display: 'flex'}}>
                <div style={{display: 'block', margin: '30px', width: '300px'}}>
                    <h1>Normal</h1>
                    <h2>Default</h2>
                    <Typeahead fieldName="fieldNameStandard1" options={options}/>
                    <div style={{height: '86px'}}></div>
                    <h2>allowUnknownValue = true</h2>
                    <Typeahead fieldName="fieldNameStandard2" options={options} allowUnknownValue={true}/>
                    <h2>isClearable = true</h2>
                    <Typeahead fieldName="fieldNameStandard3" options={options} isClearable={true}/>
                    <h2>allowUnknownValue = true, isClearable = true</h2>
                    <Typeahead fieldName="fieldNameStandard4" options={options} allowUnknownValue={true}
                        isClearable={true}/>
                    <h2>autoSelectSingleOption = true</h2>
                    <Typeahead fieldName="fieldNameStandard5" options={[options[0]]} autoSelectSingleOption={true}/>
                    <h2>Many Options</h2>
                    <Typeahead fieldName="fieldNameStandard6" options={generateOptions()}/>
                    <h2>Many Options, minTypedCharacters = 3</h2>
                    <Typeahead fieldName="fieldNameStandard7" options={generateOptions()} minTypedCharacters={3}/>
                    <h2>Many Options, minTypedCharacters = 3, isClearable = true</h2>
                    <Typeahead fieldName="fieldNameStandard8" options={generateOptions()} minTypedCharacters={3} isClearable={true}/>
                </div>
                <div style={{display: 'block', margin: '30px', width: '300px'}}>
                    <h1>Grouped</h1>
                    <h2>Default</h2>
                    <Typeahead fieldName="fieldNameGroup1" options={options} groups={groups}/>
                    <h2>renderEmptyGroups = true</h2>
                    <Typeahead fieldName="fieldNameGroup2" options={options} groups={groups} renderEmptyGroups={true}/>
                    <h2>allowUnknownValue = true</h2>
                    <Typeahead fieldName="fieldNameGroup3" options={options} groups={groups} allowUnknownValue={true}/>
                    <h2>isClearable = true</h2>
                    <Typeahead fieldName="fieldNameGroup4" options={options} groups={groups} isClearable={true}/>
                    <h2>allowUnknownValue = true, isClearable = true</h2>
                    <Typeahead fieldName="fieldNameGroup5" options={options} groups={groups} allowUnknownValue={true}
                        isClearable={true}/>
                    <h2>autoSelectSingleOption = true</h2>
                    <Typeahead fieldName="fieldNameGroup6" options={[options[0]]} groups={groups}
                        autoSelectSingleOption={true}/>
                    <h2>Many Options</h2>
                    <Typeahead fieldName="fieldNameGroup7" options={generateOptions()} groups={generateGroups()}/>
                    <h2>Many Options, minTypedCharacters = 3</h2>
                    <Typeahead fieldName="fieldNameGroup8" options={generateOptions()} groups={generateGroups()}
                        minTypedCharacters={3}/>
                    <h2>Many Options, minTypedCharacters = 3, isClearable = true</h2>
                    <Typeahead fieldName="fieldNameGroup9" options={generateOptions()} groups={generateGroups()}
                        minTypedCharacters={3} isClearable={true}/>
                </div>
            </div>
        );
    }
}

export default App;
