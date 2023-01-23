// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { cva, type VariantProps } from 'class-variance-authority';
import { type ComponentProps, forwardRef, type ReactNode } from 'react';

const styles = cva(
    [
        'cursor-pointer outline-0 flex flex-row items-center py-1 px-2 gap-1 rounded-2xl',
        'transition text-body-small font-medium border border-solid',
        'border-transparent bg-transparent',
        'hover:text-hero hover:bg-sui-light hover:border-sui',
        'focus:text-hero focus:bg-sui-light focus:border-sui',
        'active:text-steel active:bg-gray-45 active:border-transparent',
        'disabled:text-gray-60 disabled:bg-transparent disabled:border-transparent',
    ],
    {
        variants: {
            bgOnHover: {
                blueLight: ['text-hero'],
                grey: ['text-steel-dark'],
            },
        },
        defaultVariants: {
            bgOnHover: 'blueLight',
        },
    }
);

export interface ButtonConnectedToProps
    extends VariantProps<typeof styles>,
        Omit<ComponentProps<'button'>, 'ref' | 'className'> {
    iconLeft?: ReactNode;
    text?: string;
    iconRight?: ReactNode;
}

export const ButtonConnectedTo = forwardRef<
    HTMLButtonElement,
    ButtonConnectedToProps
>(({ bgOnHover, iconLeft, iconRight, text, ...rest }, ref) => {
    return (
        <button {...rest} ref={ref} className={styles({ bgOnHover })}>
            {iconLeft}
            {text}
            {iconRight}
        </button>
    );
});

ButtonConnectedTo.displayName = 'ButtonConnectedTo';
