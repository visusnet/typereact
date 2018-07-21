import type {Node} from 'react';
import React, {PureComponent} from 'react';
import * as PropTypes from 'prop-types';
import scrollIntoView from 'dom-scroll-into-view';

const DEFAULT_VALUE = undefined;
const DEFAULT_LABEL = '';
const KEY_TAB = 9;
const KEY_ENTER = 13;
const KEY_NUMPAD_ENTER = 176;
const KEY_UP = 38;
const KEY_DOWN = 40;

const UNKNOWN_VALUE_HIGHLIGHTED = -1;
const NOTHING_HIGHLIGHTED = undefined;

type Optional<T> = T | typeof undefined;

type Group = {
    label: string,
    value: any
};

type Option = {
    label: string,
    value: any,
    group?: any
};

type Props = {
    allowUnknownValue: boolean,
    autoSelectSingleOption: boolean,
    className: string,
    fieldName: string,
    groups: Optional<Group[]>,
    id?: string,
    isClearable: boolean,
    isDisabled: boolean,
    minTypedCharacters?: number,
    onBlur: Function,
    onChange: Function,
    options: Option[],
    placeholder: string,
    renderEmptyGroups: boolean,
    tabIndex?: number,
    value?: any
};

type State = {
    options: Option[],
    highlightedIndex: Optional<number>,
    isOpen: boolean,
    typedLabel: string,
    value: ?any
};

export default class Typeahead extends PureComponent<Props, State> {
    static propTypes = {
        allowUnknownValue: PropTypes.bool,
        autoSelectSingleOption: PropTypes.bool,
        className: PropTypes.string,
        fieldName: PropTypes.string.isRequired,
        groups: PropTypes.arrayOf(PropTypes.shape({
            label: PropTypes.string.isRequired,
            value: PropTypes.any.isRequired
        })),
        id: PropTypes.string,
        isClearable: PropTypes.bool,
        isDisabled: PropTypes.bool,
        minTypedCharacters: PropTypes.number,
        onBlur: PropTypes.func,
        onChange: PropTypes.func,
        options: PropTypes.arrayOf(PropTypes.shape({
            label: PropTypes.string.isRequired,
            value: PropTypes.any.isRequired,
            group: PropTypes.any
        })).isRequired,
        placeholder: PropTypes.string,
        renderEmptyGroups: PropTypes.bool,
        tabIndex: PropTypes.number,
        value: PropTypes.any
    };

    static defaultProps = {
        allowUnknownValue: false,
        autoSelectSingleOption: false,
        className: 'typeahead',
        groups: undefined,
        id: undefined,
        isClearable: false,
        isDisabled: false,
        onBlur: () => {},
        onChange: () => {},
        options: [],
        placeholder: '',
        renderEmptyGroups: false,
        value: DEFAULT_VALUE
    };

    state = {
        options: [],
        highlightedIndex: NOTHING_HIGHLIGHTED,
        isOpen: false,
        typedLabel: '',
        value: undefined
    };

    elementRefs: {
        [string]: any
    };

    _handleFocus = (): void => {
        this._openIfPossible();
    };

    _handleMouseDown = (): void => {
        this._openIfPossible();
    };

    _handleBlur = (): void => {
        this._clearIfNecessary(() => {
            const previousValue = this.state.value;
            this._updateValue(() => {
                this._afterValueChanged(previousValue)();
                this._fireOnBlur();
            });
        });
    };

    _handleChange = (e: KeyboardEvent): void => {
        const label = ((e.target: any): HTMLInputElement).value || DEFAULT_LABEL;
        this.setState({
            typedLabel: label
        }, () => {
            this.setState({
                highlightedIndex: this._getHighlightedIndexByTypedLabel()
            });

            if (label === '' && this.props.isClearable) {
                this._clearValue();
            }

            this._openIfPossible();
            this._closeIfNecessary();
        });
    };

    _openIfPossible = (): void => {
        if (!this.state.isOpen) {
            this.setState((state, props) => ({
                isOpen: props.minTypedCharacters ? props.minTypedCharacters <= state.typedLabel.length : true,
                highlightedIndex: this._getHighlightedIndexByTypedLabel()
            }));
        }
    };

    _closeIfNecessary = (): void => {
        const minTypedCharacters = this.props.minTypedCharacters;
        if (minTypedCharacters) {
            this.setState(state => ({
                isOpen: minTypedCharacters <= state.typedLabel.length
            }));
        }
    };

    _clearIfNecessary = (afterClear: Function): void => {
        if (this.props.minTypedCharacters && this.props.minTypedCharacters > this.state.typedLabel.length) {
            this._updateValue(afterClear);
        } else {
            afterClear();
        }
    };

    _getHighlightedIndexByTypedLabel = (): number | typeof undefined => {
        if (this.props.minTypedCharacters && this.props.minTypedCharacters > this.state.typedLabel.length) {
            return NOTHING_HIGHLIGHTED;
        }
        const optionIndex = this._getFilteredOptions().findIndex(this._byTypedLabel);
        const typedLabelFoundInOptions = optionIndex !== -1;
        return typedLabelFoundInOptions ? optionIndex : NOTHING_HIGHLIGHTED;
    };

    _handleKeyDown = (e: KeyboardEvent): void => {
        if (e.keyCode === KEY_UP) {
            this.setState({
                highlightedIndex: this._getPreviousIndex()
            }, () => {
                this._scrollHighlightedOptionIntoView();
            });
        } else if (e.keyCode === KEY_DOWN) {
            if (this.state.isOpen) {
                this.setState({
                    highlightedIndex: this._getNextIndex()
                }, () => {
                    this._scrollHighlightedOptionIntoView();
                });
            } else {
                this._openIfPossible();
            }
        } else if (e.keyCode === KEY_ENTER || e.keyCode === KEY_NUMPAD_ENTER) {
            if (this.state.isOpen) {
                const previousValue = this.state.value;
                this._updateValue(this._afterValueChanged(previousValue));
            }
        } else if (e.keyCode !== KEY_TAB) {
            this._openIfPossible();
        }
    };

    _updateValue = (afterValueUpdated: Function): void => {
        const shouldUpdateValue = this.state.isOpen || this.props.minTypedCharacters;
        if (shouldUpdateValue) {
            const previousValue = this.state.value;
            const valueOfHighlightedOption = this._getValueOfHighlightedOption();
            const isUnknownValue = valueOfHighlightedOption === undefined;
            const isUnknownValueAndAllowed = isUnknownValue && this.props.allowUnknownValue;
            const nextValue = isUnknownValueAndAllowed ? this.state.typedLabel : isUnknownValue ? previousValue
                : valueOfHighlightedOption;
            this.setState({
                isOpen: false,
                highlightedIndex: undefined,
                value: nextValue,
                typedLabel: this._getLabelByValue(nextValue)
            }, afterValueUpdated);
        } else {
            afterValueUpdated();
        }
    };

    _createHandleMouseDown = (value: any, highlightedIndex: number): Function => (e: MouseEvent): void => {
        e.stopPropagation();
        e.preventDefault();
        const previousValue = this.state.value;
        this.setState({
            highlightedIndex,
            isOpen: false,
            typedLabel: this._getLabelByValue(value),
            value
        }, this._afterValueChanged(previousValue));
    };

    _afterValueChanged = (previousValue: any): Function => (): void => {
        if (previousValue !== this.state.value) {
            this._fireOnChange();
        }
    };

    _fireOnChange = (value: any = this.state.value): void => {
        this.props.onChange(this.props.fieldName, value);
    };

    _fireOnBlur = (): void => {
        this.props.onBlur(this.props.fieldName, this.state.value);
    };

    _getValueOfHighlightedOption = (): any => {
        const highlightedIndex = this.state.highlightedIndex;
        if (typeof highlightedIndex === 'undefined') {
            return DEFAULT_VALUE;
        }
        const filteredOptions = this._getFilteredOptions();
        return filteredOptions[highlightedIndex].value;
    };

    _getInitialIndex = (props: Props): Optional<number> => {
        const {options, value} = props;
        const currentOptionIndex = options.findIndex(opt => opt.value === value);
        return currentOptionIndex === -1 ? NOTHING_HIGHLIGHTED : currentOptionIndex;
    };

    _getPreviousIndex = (): Optional<number> => {
        const currentOptionIndex = this.state.highlightedIndex;
        const potentialPreviousOptionIndex = currentOptionIndex === undefined ? 0 : currentOptionIndex - 1;
        const hasPreviousOption = potentialPreviousOptionIndex >= 0;
        if (this.props.allowUnknownValue && !hasPreviousOption && this._isUnknownValue()) {
            return UNKNOWN_VALUE_HIGHLIGHTED;
        }
        return hasPreviousOption ? potentialPreviousOptionIndex : currentOptionIndex;
    };

    _getNextIndex = (): Optional<number> => {
        const currentOptionIndex = this.state.highlightedIndex;
        const potentialNextOptionIndex = currentOptionIndex === undefined ? this._getFirstGroupsFirstOptionIndex()
            : currentOptionIndex + 1;
        const hasNextOption = potentialNextOptionIndex < this._getFilteredOptions().length;
        return hasNextOption ? potentialNextOptionIndex : currentOptionIndex;
    };

    _getFirstGroupsFirstOptionIndex = (): number => {
        const groups = this.props.groups;
        return typeof groups !== 'undefined' && Array.isArray(groups) && groups.length > 0
            ? this.state.options.findIndex(option => option.group === groups[0].value)
            : 0;
    };

    _getLabel = (): string => {
        return this.state.typedLabel;
    };

    _sortOptionsByGroup = (options: Option[]): Option[] => {
        const groups = this.props.groups;
        if (typeof groups === 'undefined') {
            return options;
        }
        const indexOfGroup = (groupValue: any): number => groups.findIndex(group => group.value === groupValue);
        // This is necessary because Array.prototype.sort is not necessarily stable. See:
        // http://www.ecma-international.org/ecma-262/6.0/#sec-array.prototype.sort
        const wrappedOptions = options.map((option, index) => ({option, index}));
        wrappedOptions.sort((wrappedOptionA, wrappedOptionB) => {
            const groupComparison = indexOfGroup(wrappedOptionA.option.group) -
                indexOfGroup(wrappedOptionB.option.group);
            return groupComparison === 0 ? wrappedOptionA.index - wrappedOptionB.index : groupComparison;
        });
        return wrappedOptions.map(wrappedOption => wrappedOption.option);
    };

    _typedLabelHasText = (): boolean => Boolean(this.state.typedLabel);

    _byTypedLabel = (option: Option | Group) => this._typedLabelHasText() &&
        option.label.toLowerCase().includes(this.state.typedLabel.toLowerCase());

    _byGroupAndTypedLabel = (option: Option) => {
        if (this.props.groups !== undefined) {
            const matchingGroupValues = this.props.groups.filter(this._byTypedLabel).map(group => group.value);
            if (matchingGroupValues.includes(option.group)) {
                return true;
            }
        }
        return this._byTypedLabel(option);
    };

    _getFilteredOptions = (): Option[] => {
        const typedLabelMatchesCurrentOptionLabel = this.state.typedLabel === this._getLabelByValue(this.state.value);
        let options;
        if (typedLabelMatchesCurrentOptionLabel) {
            options = this.state.options;
        } else {
            options = this.state.options.filter(this._byGroupAndTypedLabel);
        }

        return options;
    };

    _getLabelByValue = (value: any, options: Option[] = this.props.options): string => {
        const option = options.find(opt => opt.value === value);
        if (option) {
            return option.label;
        } else if (this.props.allowUnknownValue && value !== undefined) {
            return value;
        }
        return DEFAULT_LABEL;
    };

    _clearValue = (): void => {
        this.setState({
            value: DEFAULT_VALUE,
            typedLabel: DEFAULT_LABEL,
            isOpen: false,
            highlightedIndex: undefined
        }, this._afterValueChanged(this.state.value));
    };

    _validateProps = (props: Props): void => {
        const {groups, options} = props;

        const optionWithoutGroupExists = typeof groups !== 'undefined' &&
            options.some(option => !option.hasOwnProperty('group'));

        if (optionWithoutGroupExists) {
            throw new Error('There is at least one option without a group property.');
        }

        const optionWithMissingGroupExists = typeof groups !== 'undefined' &&
            options.some(option => !groups.some(group => group.value === option.group));

        if (optionWithMissingGroupExists) {
            throw new Error('There is at least one option with an unknown group.');
        }
    };

    _initializeFromProps = (props: Props): void => {
        this._validateProps(props);

        const {value, options} = props;
        const sortedOptions = this._sortOptionsByGroup(options);
        const shouldAutoSelectSingleOption = props.autoSelectSingleOption && options.length === 1;
        const actualValue = shouldAutoSelectSingleOption ? options[0].value : value;
        this.setState({
            options: sortedOptions,
            highlightedIndex: shouldAutoSelectSingleOption ? 0 : this._getInitialIndex(props),
            value: actualValue,
            typedLabel: this._getLabelByValue(actualValue, sortedOptions)
        });
    };

    _isUnknownValue = (): boolean => this._typedLabelHasText() &&
        !this._getFilteredOptions().some(option => option.label === this.state.typedLabel);

    _getAbsoluteIndex = (option: Option): number => this.state.options.findIndex(opt => opt.value === option.value);

    _relativeToAbsoluteIndex = (relativeIndex: number): number => {
        const highlightedOption = this._getFilteredOptions()[relativeIndex];
        return this.state.options.indexOf(highlightedOption);
    };

    _scrollHighlightedOptionIntoView = () => {
        if (this.state.isOpen && this.state.highlightedIndex !== NOTHING_HIGHLIGHTED &&
            this.state.highlightedIndex !== UNKNOWN_VALUE_HIGHLIGHTED) {
            const optionNode = this.elementRefs[`option_${this._relativeToAbsoluteIndex(this.state.highlightedIndex)}`];
            const menuNode = this.elementRefs['menu'];
            scrollIntoView(optionNode, menuNode, {onlyScrollIfNeeded: true});
        }
    };

    componentWillMount(): void {
        this.elementRefs = {};
    }

    componentDidMount(): void {
        this._initializeFromProps(this.props);
        const {autoSelectSingleOption, options} = this.props;
        if (autoSelectSingleOption && options.length === 1) {
            const valueOfSingleOption = options[0].value;
            this._fireOnChange(valueOfSingleOption);
        }
    }

    componentWillReceiveProps(nextProps: Props): void {
        this._initializeFromProps(nextProps);
    }

    componentDidUpdate(prevProps: Props): void {
        const {autoSelectSingleOption, options} = this.props;
        const haveOptionsChanged = prevProps.options !== options;
        const hasAutoSelectSingleOptionChanged = prevProps.autoSelectSingleOption !== autoSelectSingleOption;
        const shouldFireOnChange = haveOptionsChanged || hasAutoSelectSingleOptionChanged;
        if (shouldFireOnChange && autoSelectSingleOption && options.length === 1) {
            const valueOfSingleOption = options[0].value;
            this._fireOnChange(valueOfSingleOption);
        }
    }

    renderNoOptionsMessage(): Node {
        if (!this.props.allowUnknownValue && this._getFilteredOptions().length === 0 &&
            this.state.typedLabel.length !== 0) {
            return (
                <div className="typeahead__no_options">
                    <p><span className="typeahead__no_options__keyword">{this.state.typedLabel}</span> nicht
                        gefunden</p>
                </div>
            );
        }
    }

    renderUnknownValueOption(): Node {
        if (this.props.allowUnknownValue && this._isUnknownValue()) {
            const option = {
                label: this.state.typedLabel,
                value: this.state.typedLabel
            };
            return this.renderOption(option, UNKNOWN_VALUE_HIGHLIGHTED);
        }
    }

    // noinspection JSMethodCanBeStatic
    renderNewOptionMarker(): Node {
        return (<span className="typeahead__option__new_option"> (+) </span>);
    }

    renderOption = (option: Option, absoluteIndex: number): Node => {
        return (
            <div ref={element => this.elementRefs[`option_${absoluteIndex}`] = element}
                key={`typeahead__option__${option.value}`}
                className="typeahead__option"
                data-index={absoluteIndex}
                data-value={option.value}
                data-highlighted={absoluteIndex === this._relativeToAbsoluteIndex(this.state.highlightedIndex)}
                data-group={option.group}
                onMouseDown={this._createHandleMouseDown(option.value, absoluteIndex)}>
                {option.label}
                {absoluteIndex === UNKNOWN_VALUE_HIGHLIGHTED ? this.renderNewOptionMarker() : null}
            </div>
        );
    };

    renderGroup = (group: Group): Node => {
        const filteredOptions = this._getFilteredOptions();
        const groupOptions = filteredOptions.filter(option => option.group === group.value);

        if (!this.props.renderEmptyGroups && groupOptions.length === 0) {
            return null;
        }

        return (
            <div key={`typeahead__group__${group.value}`} className="typeahead__group" data-value={group.value}>
                <div className="typeahead__group__label">{group.label}</div>
                {groupOptions.map(option => this.renderOption(option, this._getAbsoluteIndex(option)))}
            </div>
        );
    };

    renderGroups(): ?Node[] {
        return this.props.groups.map(this.renderGroup);
    }

    renderMenu(): Node {
        if (this.state.isOpen) {
            return (
                <div ref={element => this.elementRefs['menu'] = element} className="typeahead__options">
                    {this.renderNoOptionsMessage()}
                    {this.renderUnknownValueOption()}
                    {this.props.groups === undefined ? this._getFilteredOptions().map(
                        option => this.renderOption(option, this._getAbsoluteIndex(option))) : this.renderGroups()}
                </div>
            );
        }
    }

    _handleClearClick = (e: MouseEvent): void => {
        e.preventDefault();
        this._clearValue();
    };

    renderClearButton(): Node {
        if (this.props.isClearable && !this.props.isDisabled && this.state.value) {
            return (
                <button className="typeahead__clear" onClick={this._handleClearClick}/>
            );
        }
    }

    render(): Node {
        const idProp = this.props.id ? {id: this.props.id} : {};
        const tabIndexProp = this.props.tabIndex ? {tabIndex: this.props.tabIndex} : {};
        const className = this.props.className;
        return (
            <div className={className}>
                <input
                    {...idProp}
                    {...tabIndexProp}
                    disabled={this.props.isDisabled}
                    name={this.props.fieldName}
                    onFocus={this._handleFocus}
                    onBlur={this._handleBlur}
                    onChange={this._handleChange}
                    onKeyDown={this._handleKeyDown}
                    onMouseDown={this._handleMouseDown}
                    placeholder={this.props.placeholder}
                    value={this._getLabel()}
                />
                {this.renderClearButton()}
                {this.renderMenu()}
            </div>
        );
    }
}
