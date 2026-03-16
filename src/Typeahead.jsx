// @flow
import type {Node} from 'react';
import React, {PureComponent} from 'react';
import * as PropTypes from 'prop-types';
import memoize from 'memoize-one';
import List from 'react-virtualized/dist/commonjs/List';
import AutoSizer from 'react-virtualized/dist/commonjs/AutoSizer';

const DEFAULT_OPTION_HEIGHT = 28;
const DEFAULT_GROUP_PADDING = 31;
const DEFAULT_NO_OPTIONS_HEIGHT = DEFAULT_OPTION_HEIGHT;
const DEFAULT_LIST_HEIGHT = 300;
const DEFAULT_GERMAN_NOT_FOUND_LABEL = 'nicht gefunden';
const DEFAULT_VALUE = undefined;
const DEFAULT_LABEL = '';
const DEFAULT_ESTIMATED_CHARACTER_WIDTH = 6.75;
const KEY_TAB = 9;
const KEY_ENTER = 13;
const KEY_NUMPAD_ENTER = 176;
const KEY_UP = 38;
const KEY_DOWN = 40;
const AUTO_SIZER_PADDING = 4;

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

type WrappedOption = {
    option: Option,
    index: number
};

type OptionRow = {|
    option: Option,
    rowIndex: number
|};

type GroupRow = {|
    group: Group,
    rowIndex: number
|};

type Row = OptionRow | GroupRow;

type Props = {
    allowUnknownValue: boolean,
    autoSelectSingleOption: boolean,
    calculateGroupHeight: (group: Group, index: number) => number,
    calculateListHeight: (rows: Row[], totalRowsHeight: number) => number,
    calculateOptionHeight: (option: Option, index: number) => number,
    className: string,
    estimateMenuWidth: Optional<boolean | (rows: Row[]) => Optional<number>>,
    fieldName: string,
    groups: Optional<Group[]>,
    id?: string,
    isClearable: boolean,
    isDisabled: boolean,
    menuWidth: Optional<number>,
    notFoundLabel: string,
    onBlur: Function,
    onChange: Function,
    options: Option[],
    placeholder: string,
    renderEmptyGroups: boolean,
    tabIndex?: number,
    value?: any
};

type State = {
    highlightedRowIndex: Optional<number>,
    isOpen: boolean,
    typedLabel: string,
    value: ?any,
    props: ?Props,
    menuOpenDirection: 'down' | 'up'
};

const MENU_OPEN_DIRECTION_DOWN = 'down';
const MENU_OPEN_DIRECTION_UP = 'up';

const INITIAL_STATE: State = {
    highlightedRowIndex: NOTHING_HIGHLIGHTED,
    isOpen: false,
    typedLabel: '',
    value: undefined,
    props: undefined,
    menuOpenDirection: MENU_OPEN_DIRECTION_DOWN
};

export default class Typeahead extends PureComponent<Props, State> {
    static propTypes = {
        allowUnknownValue: PropTypes.bool,
        autoSelectSingleOption: PropTypes.bool,
        calculateGroupHeight: PropTypes.func,
        calculateListHeight: PropTypes.func,
        calculateOptionHeight: PropTypes.func,
        className: PropTypes.string,
        estimateMenuWidth: PropTypes.oneOfType([PropTypes.bool, PropTypes.func]),
        fieldName: PropTypes.string.isRequired,
        groups: PropTypes.arrayOf(PropTypes.shape({
            label: PropTypes.string.isRequired,
            value: PropTypes.any.isRequired
        })),
        id: PropTypes.string,
        isClearable: PropTypes.bool,
        isDisabled: PropTypes.bool,
        menuWidth: PropTypes.number,
        notFoundLabel: PropTypes.string,
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
        calculateGroupHeight: _calculateGroupHeight,
        calculateListHeight: _calculateListHeight,
        calculateOptionHeight: _calculateOptionHeight,
        className: 'typeahead',
        groups: undefined,
        id: undefined,
        isClearable: false,
        isDisabled: false,
        notFoundLabel: DEFAULT_GERMAN_NOT_FOUND_LABEL,
        onBlur: () => {},
        onChange: () => {},
        options: [],
        placeholder: '',
        renderEmptyGroups: false,
        value: DEFAULT_VALUE
    };

    state = INITIAL_STATE;

    _getSortedOptions = memoize(
        (props: Props) => _sortOptionsByGroup(props.options, props.groups)
    );

    elementRefs: {
        [string]: any
    } = {};

    isMouseDown: boolean = false;

    _handleInputFocus = (): void => {
        this._openIfPossible();
    };

    _handleInputMouseDown = (): void => {
        this._openIfPossible();
    };

    _handleInputBlur = (): void => {
        if (!this.isMouseDown) {
            const previousValue = this.state.value;
            this._updateValue(() => {
                this._afterValueChanged(previousValue)();
                this._fireOnBlur();
            });
        }
    };

    _handleInputChange = (e: KeyboardEvent): void => {
        const label = ((e.target: any): HTMLInputElement).value || DEFAULT_LABEL;
        this.setState({
            typedLabel: label
        }, () => {
            const highlightedRowIndex = this._gethighlightedRowIndexByTypedLabel();
            this.setState({
                highlightedRowIndex: highlightedRowIndex
            });

            if (label === '' && this.props.isClearable) {
                this._clearValue();
            }

            this._openIfPossible();
        });
    };

    _handleInputKeyDown = (e: KeyboardEvent): void => {
        if (e.keyCode === KEY_UP) {
            this.setState({
                highlightedRowIndex: this._getPreviousOptionRowIndex()
            });
        } else if (e.keyCode === KEY_DOWN) {
            if (this.state.isOpen) {
                this.setState({
                    highlightedRowIndex: this._getNextOptionRowIndex()
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

    _handleClearClick = (e: MouseEvent): void => {
        e.preventDefault();
        this._clearValue();
    };

    _createHandleOptionMouseDown = (value: any, highlightedRowIndex: number): Function => (e: MouseEvent): void => {
        e.stopPropagation();
        e.preventDefault();
        const previousValue = this.state.value;
        this.setState({
            highlightedRowIndex,
            isOpen: false,
            typedLabel: Typeahead._getLabelByValue(value, this.props.options, this.props.allowUnknownValue),
            value
        }, this._afterValueChanged(previousValue));
    };

    _handleListMouseDown = () => {
        this.isMouseDown = true;
    };

    _handleListMouseUp = () => {
        this.isMouseDown = false;
    };

    _openIfPossible = (): void => {
        if (!this.state.isOpen) {
            this.setState({
                isOpen: true,
                highlightedRowIndex: this._gethighlightedRowIndexByTypedLabel()
            });
        }
    };

    _gethighlightedRowIndexByTypedLabel = (): number | typeof undefined => {
        const rows = this._generateRows(
            this._getFilteredOptions(),
            this.props.groups,
            this.props,
            this._isUnknownValue()
        );
        // $FlowFixMe Flow does not recognize that filter narrowed down the list to only OptionRows
        const foundRow = rows.filter(_isOptionRow).find(this._rowByTypedLabel);
        return foundRow ? foundRow.rowIndex : NOTHING_HIGHLIGHTED;
    };

    _updateValue = (afterValueUpdated: Function): void => {
        const shouldUpdateValue = this.state.isOpen;
        if (shouldUpdateValue) {
            const previousValue = this.state.value;
            const valueOfHighlightedOption = this._getValueOfHighlightedOption();
            const isUnknownValue = valueOfHighlightedOption === undefined;
            const isUnknownValueAndAllowed = isUnknownValue && this.props.allowUnknownValue;
            const nextValue = isUnknownValueAndAllowed ? this.state.typedLabel : isUnknownValue ? previousValue
                : valueOfHighlightedOption;
            this.setState({
                isOpen: false,
                highlightedRowIndex: undefined,
                value: nextValue,
                typedLabel: Typeahead._getLabelByValue(nextValue, this.props.options, this.props.allowUnknownValue)
            }, afterValueUpdated);
        } else {
            afterValueUpdated();
        }
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
        const highlightedRowIndex = this.state.highlightedRowIndex;
        if (typeof highlightedRowIndex === 'undefined') {
            return DEFAULT_VALUE;
        }
        const rows = this._generateRows(
            this._getFilteredOptions(),
            this.props.groups,
            this.props,
            this._isUnknownValue()
        );
        return _getOptionRow(rows, r => r.rowIndex === highlightedRowIndex).option.value;
    };

    static _getInitialOptionRowIndex = (props: Props): Optional<number> => {
        const {options, groups, value} = props;

        const isUnknownValue = !props.options.some(option => option.value === props.value);
        if (isUnknownValue && props.allowUnknownValue) {
            return UNKNOWN_VALUE_HIGHLIGHTED;
        }

        const rows = groups
            ? _generateGroupedRows(groups, options, props)
            : _generateOptionRows(options);
        const currentRow = _findOptionRow(rows, r => r.option.value === value);
        if (currentRow) {
            return currentRow.rowIndex;
        }

        return NOTHING_HIGHLIGHTED;
    };

    _getPreviousOptionRowIndex = (): Optional<number> => {
        const currentRowIndex = this.state.highlightedRowIndex;
        const potentialPreviousOptionIndex = this._getPotentialPreviousOptionRowIndex();
        const hasPreviousOption = potentialPreviousOptionIndex >= 0;
        if (this.props.allowUnknownValue && !hasPreviousOption && this._isUnknownValue()) {
            return UNKNOWN_VALUE_HIGHLIGHTED;
        }
        return hasPreviousOption ? potentialPreviousOptionIndex : currentRowIndex;
    };

    _getPotentialPreviousOptionRowIndex = (): number => {
        const currentRowIndex = this.state.highlightedRowIndex;
        if (currentRowIndex === undefined) {
            return 0;
        }
        const rows = this._generateRows(
            this._getFilteredOptions(),
            this.props.groups,
            this.props,
            this._isUnknownValue()
        );
        const potentialPreviousOptionRow = _findLast(rows, r => r.rowIndex < currentRowIndex && _isOptionRow(r));
        return potentialPreviousOptionRow ? potentialPreviousOptionRow.rowIndex : -1;
    };

    _getNextOptionRowIndex = (): Optional<number> => {
        const currentRowIndex = this.state.highlightedRowIndex;
        const rows = this._generateRows(
            this._getFilteredOptions(),
            this.props.groups,
            this.props,
            this._isUnknownValue()
        );
        if (currentRowIndex === undefined) {
            return this._getFirstGroupsFirstOptionIndex(rows);
        }
        const potentialNextOptionRow = _findOptionRow(rows, r => r.rowIndex > currentRowIndex);
        return potentialNextOptionRow ? potentialNextOptionRow.rowIndex : currentRowIndex;
    };

    _getFirstGroupsFirstOptionIndex = (rows: Row[]): number => {
        const firstOptionRow = _findOptionRow(rows, _thatExist);
        return firstOptionRow ? firstOptionRow.rowIndex : 0;
    };

    _typedLabelHasText = (): boolean => Boolean(this.state.typedLabel);

    _byTypedLabel = (option: Option | Group) => this._typedLabelHasText() &&
        option.label.toLowerCase().includes(this.state.typedLabel.toLowerCase());

    _rowByTypedLabel = (row: OptionRow) => this._typedLabelHasText() &&
        row.option.label.toLowerCase().includes(this.state.typedLabel.toLowerCase());

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
        const {options, allowUnknownValue} = this.props;
        const currentOptionLabel = Typeahead._getLabelByValue(this.state.value, options, allowUnknownValue);
        const typedLabelMatchesCurrentOptionLabel = this.state.typedLabel === currentOptionLabel;
        return typedLabelMatchesCurrentOptionLabel
            ? this._getSortedOptions(this.props)
            : this._getSortedOptions(this.props).filter(this._byGroupAndTypedLabel);
    };

    static _getLabelByValue = (value: any, options: Option[], allowUnknownValue: boolean): string => {
        const option = options.find(opt => opt.value === value);
        if (option) {
            return option.label;
        } else if (allowUnknownValue && value !== undefined) {
            return value;
        }
        return DEFAULT_LABEL;
    };

    _clearValue = (): void => {
        this.setState({
            value: DEFAULT_VALUE,
            typedLabel: DEFAULT_LABEL,
            isOpen: false,
            highlightedRowIndex: undefined
        }, this._afterValueChanged(this.state.value));
    };

    static _validateProps = (props: Props): void => {
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

    static getDerivedStateFromProps(props: Props, prevState: State): ?$Shape<State> {
        Typeahead._validateProps(props);

        const {options} = props;
        if (typeof prevState.props === 'undefined' || prevState.props !== props) {
            const shouldAutoSelectSingleOption = props.autoSelectSingleOption && options.length === 1;
            const highlightedRowIndex = shouldAutoSelectSingleOption ? 0 : Typeahead._getInitialOptionRowIndex(props);
            const value = shouldAutoSelectSingleOption ? options[0].value : props.value;
            const typedLabel = Typeahead._getLabelByValue(value, props.options, props.allowUnknownValue);
            return {
                highlightedRowIndex,
                value,
                typedLabel,
                props
            };
        }
        return null;
    }

    _isUnknownValue = (): boolean => this._typedLabelHasText() &&
        !this._getFilteredOptions().some(option => option.label === this.state.typedLabel);

    _fireOnChangeIfSingleOptionWasUpdated = (prevProps: Props) => {
        const {autoSelectSingleOption, options} = this.props;
        const haveOptionsChanged = prevProps.options !== options;
        const hasAutoSelectSingleOptionChanged = prevProps.autoSelectSingleOption !== autoSelectSingleOption;
        const shouldFireOnChange = haveOptionsChanged || hasAutoSelectSingleOptionChanged;
        if (shouldFireOnChange && autoSelectSingleOption && options.length === 1) {
            const valueOfSingleOption = options[0].value;
            this._fireOnChange(valueOfSingleOption);
        }
    };

    _handleScroll = () => {
        this._updateMenuOpenDirection();
    };

    _handleResize = () => {
        this._updateMenuOpenDirection();
    };

    _updateMenuOpenDirection = () => {
        const container = this.elementRefs['container'];
        const options = this._getFilteredOptions();
        const rows = this._generateRows(
            options,
            this.props.groups,
            this.props,
            this._isUnknownValue()
        );

        const totalRowsHeight = this._calculateTotalRowHeights(rows, this.props);
        const spacingThreshold = DEFAULT_GROUP_PADDING + DEFAULT_OPTION_HEIGHT;
        const listHeight = this.props.calculateListHeight(rows, totalRowsHeight) + spacingThreshold;

        const menuTop = container.getBoundingClientRect().top;
        const menuOpenDirection = window.innerHeight < menuTop + listHeight
            ? MENU_OPEN_DIRECTION_UP
            : MENU_OPEN_DIRECTION_DOWN;

        if (this.state.menuOpenDirection !== menuOpenDirection) {
            this.setState({
                menuOpenDirection
            });
        }
    };

    componentDidMount(): void {
        const {autoSelectSingleOption, options} = this.props;
        if (autoSelectSingleOption && options.length === 1) {
            const valueOfSingleOption = options[0].value;
            this.setState({
                highlightedRowIndex: 0,
                value: valueOfSingleOption,
                typedLabel: Typeahead._getLabelByValue(valueOfSingleOption, this.props.options,
                    this.props.allowUnknownValue)
            });
            this._fireOnChange(valueOfSingleOption);
        }

        this._updateMenuOpenDirection();

        window.addEventListener('scroll', this._handleScroll);
        window.addEventListener('resize', this._handleResize);
    }

    componentWillUnmount() {
        window.removeEventListener('scroll', this._handleScroll);
        window.removeEventListener('resize', this._handleResize);
    }

    componentDidUpdate(prevProps: Props): void {
        this._fireOnChangeIfSingleOptionWasUpdated(prevProps);
        this._updateMenuOpenDirection();
    }

    renderNoOptionsMessage(): Node {
        if (!this.props.allowUnknownValue && this._getFilteredOptions().length === 0 &&
            this.state.typedLabel.length !== 0) {
            return (
                <div className="typeahead__no_options">
                    <span className="typeahead__no_options__keyword">{this.state.typedLabel}</span>
                    &nbsp;{this.props.notFoundLabel}
                </div>
            );
        }
    }

    // noinspection JSMethodCanBeStatic
    renderNewOptionMarker(): Node {
        return (<span className="typeahead__option__new_option"> (+) </span>);
    }

    renderOption = (option: Option, rowIndex: number, style: any): Node => {
        const isHighlighted = typeof this.state.highlightedRowIndex !== 'undefined'
            && rowIndex === this.state.highlightedRowIndex;
        return (
            <div ref={element => this.elementRefs[`option_${rowIndex}`] = element}
                key={`typeahead__option__${option.value}`}
                className="typeahead__option"
                data-index={rowIndex}
                data-value={option.value}
                data-highlighted={isHighlighted}
                data-group={option.group}
                style={style}
                onMouseDown={this._createHandleOptionMouseDown(option.value, rowIndex)}>
                {option.label}
                {rowIndex === UNKNOWN_VALUE_HIGHLIGHTED ? this.renderNewOptionMarker() : null}
            </div>
        );
    };

    renderGroup = (group: Group, style: any): Node => {
        return (
            <div key={`typeahead__group__${group.value}`} className="typeahead__group" data-value={group.value}
                style={style}>
                <div className="typeahead__group__label">{group.label}</div>
            </div>
        );
    };

    _generateRows = memoize(
        (options: Option[], groups: Optional<Group[]>, props: Props, isUnknownValue: boolean): Row[] => {
            let rows: Row[] = [];
            if (props.allowUnknownValue && isUnknownValue) {
                rows.push({
                    option: {
                        label: this.state.typedLabel,
                        value: this.state.typedLabel
                    },
                    rowIndex: UNKNOWN_VALUE_HIGHLIGHTED
                });
            }
            rows = [
                ...rows,
                ...(groups
                    ? _generateGroupedRows(groups, options, props)
                    : _generateOptionRows(options))
            ];
            return rows;
        }
    );

    _calculateTotalRowHeights = memoize(
        (rows: Row[], props: Props) => {
            return rows.reduce((totalRowsHeight, row) => totalRowsHeight + (row.group
                ? props.calculateGroupHeight(row.group, row.rowIndex)
                : props.calculateOptionHeight(row.option, row.rowIndex)), 0);
        });

    _createRenderRow = (rows: Row[]) => ({index: rowIndex, style}: { index: number, style: any }) => {
        const row = rows[rowIndex];
        if (row.option) {
            return this.renderOption(row.option, row.rowIndex, style);
        }
        return this.renderGroup(row.group, style);
    };

    _createCalculateRowHeight = (rows: Row[]) => ({index: rowIndex}: { index: number }) => {
        if (rows[rowIndex].group) {
            return this.props.calculateGroupHeight(rows[rowIndex].group, rowIndex);
        }
        return this.props.calculateOptionHeight(rows[rowIndex].option, rowIndex);
    };

    _createScrollToIndexProp = () => typeof this.state.highlightedRowIndex === 'undefined'
        ? {}
        : {scrollToIndex: this.state.highlightedRowIndex};

    _noRowsRenderer = () => this.renderNoOptionsMessage();

    _estimateMenuWidth = memoize(
        (estimateMenuWidth: Optional<boolean | (rows: Row[]) => Optional<number>>, rows: Row[]): Optional<number> =>
            typeof estimateMenuWidth === 'function'
                ? estimateMenuWidth(rows)
                : _estimateMenuWidth(rows)
    );

    _calculateMenuWidth = (rows: Row[]) => {
        return this.props.menuWidth
            ? this.props.menuWidth
            : this.props.estimateMenuWidth
                   ? this._estimateMenuWidth(this.props.estimateMenuWidth, rows)
                   : undefined;
    };

    renderMenu(): Node {
        if (this.state.isOpen) {
            const rows = this._generateRows(
                this._getFilteredOptions(),
                this.props.groups,
                this.props,
                this._isUnknownValue()
            );

            const renderRow = this._createRenderRow(rows);
            const calculateRowHeight = this._createCalculateRowHeight(rows);
            const scrollToIndexProp = this._createScrollToIndexProp();
            const totalRowsHeight = this._calculateTotalRowHeights(rows, this.props);
            const listHeight = this.props.calculateListHeight(rows, totalRowsHeight);
            const menuWidth = this._calculateMenuWidth(rows);

            const styleProp = menuWidth ? {style: {width: `${menuWidth}px`}} : {};

            return (
                <div
                    ref={element => this.elementRefs['menu'] = element}
                    className="typeahead__options"
                    onMouseDown={this._handleListMouseDown}
                    onMouseUp={this._handleListMouseUp}
                    {...styleProp}>
                    <AutoSizer disableHeight>
                        {({width}) => (
                            <List
                                height={listHeight}
                                width={typeof menuWidth === 'number' && menuWidth > width ? menuWidth : width -
                                    AUTO_SIZER_PADDING}
                                rowCount={rows.length}
                                noRowsRenderer={this._noRowsRenderer}
                                rowHeight={calculateRowHeight}
                                rowRenderer={renderRow}
                                tabIndex={null}
                                scrollToAlignment="start"
                                {...scrollToIndexProp}
                            />
                        )}
                    </AutoSizer>
                </div>
            );
        }
    }

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
        const className = `${this.props.className} typeahead--${this.state.menuOpenDirection}`;
        return (
            <div className={className} ref={element => this.elementRefs['container'] = element}>
                <input
                    {...idProp}
                    {...tabIndexProp}
                    disabled={this.props.isDisabled}
                    name={this.props.fieldName}
                    onFocus={this._handleInputFocus}
                    onBlur={this._handleInputBlur}
                    onChange={this._handleInputChange}
                    onKeyDown={this._handleInputKeyDown}
                    onMouseDown={this._handleInputMouseDown}
                    placeholder={this.props.placeholder}
                    value={this.state.typedLabel}
                />
                {this.renderClearButton()}
                {this.renderMenu()}
            </div>
        );
    }
}

function _sortOptionsByGroup(options: Option[], groups: Optional<Group[]>): Option[] {
    if (typeof groups === 'undefined') {
        return options;
    }
    // This is necessary because Array.prototype.sort is not necessarily stable. See:
    // http://www.ecma-international.org/ecma-262/6.0/#sec-array.prototype.sort
    const wrappedOptions = options.map(_wrapOption);
    wrappedOptions.sort(_compareOptions(groups));
    return wrappedOptions.map(_unwrapOption);
}

function _indexOfGroup(groups: Group[], groupValue: any): number {
    return groups.findIndex(group => group.value === groupValue);
}

function _wrapOption(option: Option, index: number): WrappedOption {
    return {option, index};
}

function _unwrapOption(wrappedOption: WrappedOption): Option {
    return wrappedOption.option;
}

function _compareOptions(groups: Group[]): (WrappedOption, WrappedOption) => number {
    return (wrappedOptionA: WrappedOption, wrappedOptionB: WrappedOption) => {
        const groupComparison = _indexOfGroup(groups, wrappedOptionA.option.group) -
            _indexOfGroup(groups, wrappedOptionB.option.group);
        return groupComparison === 0 ? wrappedOptionA.index - wrappedOptionB.index : groupComparison;
    };
}

function _calculateGroupHeight(group: Group, rowIndex: number) {
    return rowIndex > 0
        ? DEFAULT_OPTION_HEIGHT + DEFAULT_GROUP_PADDING
        : DEFAULT_OPTION_HEIGHT;
}

function _calculateListHeight(rows: Row[], totalRowsHeight: number) {
    return rows.length === 0
        ? DEFAULT_NO_OPTIONS_HEIGHT
        : Math.min(totalRowsHeight, DEFAULT_LIST_HEIGHT);
}

function _calculateOptionHeight() {
    return DEFAULT_OPTION_HEIGHT;
}

function _rowWithLongestLabel(longestRow: ?OptionRow, row: Row): ?OptionRow {
    if (!row.option) {
        return longestRow;
    }
    if (!longestRow) {
        return row;
    }
    return row.option.label.length > longestRow.option.label.length ? row : longestRow;
}

function _estimateMenuWidth(rows: Row[]): Optional<number> {
    const row: ?OptionRow = rows.reduce(_rowWithLongestLabel, undefined);
    return row
        ? Math.ceil(row.option.label.length * DEFAULT_ESTIMATED_CHARACTER_WIDTH)
        : undefined;
}

function _isOptionRow(row: Row): boolean {
    return row.hasOwnProperty('option');
}

function _findLast<T>(array: T[], comparator: T => boolean): ?T {
    for (let i = array.length - 1; i >= 0; i--) {
        if (comparator(array[i])) {
            return array[i];
        }
    }
    return undefined;
}

function _thatExist() {
    return true;
}

function _findOptionRow(rows: Row[], comparator: OptionRow => boolean): ?OptionRow {
    const row = rows.find((r: any) => _isOptionRow(r) && comparator(r));
    return ((row: any): ?OptionRow);
}

function _getOptionRow(rows: Row[], comparator: OptionRow => boolean): OptionRow {
    return ((_findOptionRow(rows, comparator): any): OptionRow);
}

function _generateGroupedRows(groups: Group[], options: Option[], props: Props) {
    const rows = [];
    let rowIndex = 0;
    groups.forEach((group: Group) => {
        const groupOptions = options.filter(option => option.group === group.value);
        if (groupOptions.length > 0 || props.renderEmptyGroups) {
            rows.push({group, rowIndex});
            rowIndex++;
        }
        groupOptions.forEach((option: Option) => {
            rows.push({
                option,
                rowIndex
            });
            rowIndex++;
        });
    });
    return rows;
}

function _generateOptionRows(options: Option[]) {
    return options.map((option: Option, rowIndex: number) => ({
        option,
        rowIndex: rowIndex
    }));
}
