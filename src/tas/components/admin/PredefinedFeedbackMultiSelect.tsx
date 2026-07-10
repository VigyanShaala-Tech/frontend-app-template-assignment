/**
 * Multi-select predefined feedback control using Paragon DropdownButton + CheckboxSet.
 */

import React from 'react';
import { DropdownButton, Form } from '@openedx/paragon';

interface Props {
  controlId: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

export const PredefinedFeedbackMultiSelect: React.FC<Props> = ({
  controlId,
  options,
  selected,
  onChange,
}) => {
  const title = selected.length > 0
    ? `${selected.length} selected`
    : 'Select feedback…';

  const toggleFeedback = (feedback: string) => {
    const nextSelected = selected.includes(feedback)
      ? selected.filter((item) => item !== feedback)
      : [...selected, feedback];
    onChange(options.filter((item) => nextSelected.includes(item)));
  };

  return (
    <DropdownButton
      variant="outline-primary"
      id={controlId}
      title={title}
    >
      <Form.CheckboxSet
        name={controlId}
        className="pgn__dropdown-filter-checkbox-group"
        aria-label="Predefined feedback options"
      >
        {options.map((feedback) => (
          <Form.Checkbox
            key={`${controlId}-${feedback}`}
            value={feedback}
            checked={selected.includes(feedback)}
            onChange={() => toggleFeedback(feedback)}
          >
            {feedback}
          </Form.Checkbox>
        ))}
      </Form.CheckboxSet>
    </DropdownButton>
  );
};
