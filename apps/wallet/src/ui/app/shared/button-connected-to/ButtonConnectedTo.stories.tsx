// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { type Meta, type StoryObj } from '@storybook/react';

import { ButtonConnectedTo } from './';

export default {
    component: ButtonConnectedTo,
} as Meta<typeof ButtonConnectedTo>;

export const Default: StoryObj<typeof ButtonConnectedTo> = {
    args: {
        text: 'Button',
    },
};

export const LightGrey: StoryObj<typeof ButtonConnectedTo> = {
    args: {
        text: 'Button',
        bgOnHover: 'grey',
    },
};

export const Disabled: StoryObj<typeof ButtonConnectedTo> = {
    args: {
        text: 'Button',
        bgOnHover: 'grey',
        disabled: true,
    },
};
