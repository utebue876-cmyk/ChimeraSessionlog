import { Button, Checkbox, Divider, Group, Paper, Stack, Text, TextInput, Title, Tooltip } from '@mantine/core';
import { Document } from '@medplum/react';
import type { ChangeEvent, JSX } from 'react';
import { FIELD_MAX_LENGTH } from '../../config/constants';
import { useSelfReferralStore } from '../../store/selfReferralStore';
import { digitsOnly, formatCardNumber, formatPostcode } from '../../utils/cardDetails';
import { SelfReferralStepper } from './SelfReferralStepper';
import { useSelfReferralExcess } from './useSelfReferralExcess';

export function SelfReferralExcessPage(): JSX.Element {
  const setStep = useSelfReferralStore((s) => s.setStep);
  const { values, errors, sameAsPersonal, set, toggleSameAsPersonal, handleConfirm } = useSelfReferralExcess();

  return (
    <Document width={800} fill>
      <Paper
        p="lg"
        style={{
          backgroundColor: 'var(--mantine-color-blue-9)',
          borderBottomRightRadius: 0,
          borderBottomLeftRadius: 0,
          borderTopRightRadius: 8,
          borderTopLeftRadius: 8,
        }}
      >
        <Stack gap="xs" mb="lg" align="left" c="white">
          <Title order={2}>Welcome to IPRS Health's Services</Title>
        </Stack>

        <Stack gap="md" mb="lg">
          <Title order={4} c="white" ta="left">
            Important Information: Collection of £50 excess
          </Title>
          <Text size="sm" c="var(--mantine-color-white)" ta="left">
            Before you access IPRS Health services on behalf of Alliance Health Group, we need to collect and validate a
            payment card.
          </Text>
          <Text size="sm" fw={700} c="var(--mantine-color-white)">
            Payment card details are taken in case IPRS Health needs to collect an excess on your policy.
          </Text>
          <Text size="sm" c="var(--mantine-color-white)">
            A £50 excess applies per person, per policy year. This means each member is responsible for the first £50 of
            eligible treatment costs incurred during a Scheme year.
          </Text>
          <Text size="sm" c="var(--mantine-color-white)">
            The excess is payable once, per person, in each Scheme year and will be applied to the first paid invoice of
            the Scheme year. Once the excess has been met, further eligible claims for that person will be covered in
            accordance with the Scheme rules and benefits. The excess only applies to treatment that has been approved
            under the Scheme. Any treatment or services that are not covered will remain the responsibility of the
            member. For further information about how the excess applies, please contact Alliance Health Group before
            arranging treatment.
          </Text>
          <Text size="sm" c="var(--mantine-color-white)">
            To streamline your service, we would like to validate a payment card, that we will hold securely and only
            use if your excess is due. To validate your card a £1 validation transaction will be processed, however,
            this will be refunded back to your card, by IPRS Health.
          </Text>
          <Text size="sm" c="var(--mantine-color-white)">
            If IPRS Health do debit your card, we always provide you with 5 working days' notice, by email.
          </Text>
          <Text size="sm" fw={700} ta="left" c="var(--mantine-color-white)">
            Please provide the card details below that you would like IPRS Health to validate.
          </Text>
        </Stack>
      </Paper>

      <SelfReferralStepper currentStep={2} />

      <Paper withBorder p="lg" m="lg" style={{ backgroundColor: 'var(--mantine-color-gray-0)' }}>
        <Stack gap="md">
          <Title order={4}>Payment Details</Title>
          <TextInput
            label="Name on Card"
            withAsterisk
            value={values.nameOnCard}
            onChange={(e: ChangeEvent<HTMLInputElement>) => set('nameOnCard', e.currentTarget.value)}
            error={!!errors.nameOnCard}
            maxLength={FIELD_MAX_LENGTH.creditCardName}
          />
          <TextInput
            label="Card Number"
            placeholder="0000 0000 0000 0000"
            maxLength={FIELD_MAX_LENGTH.creditCardNumber}
            withAsterisk
            value={values.cardNumber}
            onChange={(e: ChangeEvent<HTMLInputElement>) => set('cardNumber', formatCardNumber(e.currentTarget.value))}
            error={!!errors.cardNumber}
          />
          <Group align="flex-start" gap="md">
            <TextInput
              label="Expiry Month"
              placeholder="MM"
              maxLength={FIELD_MAX_LENGTH.creditCardExpiry}
              withAsterisk
              style={{ width: 100 }}
              value={values.expiryMonth}
              onChange={(e: ChangeEvent<HTMLInputElement>) => set('expiryMonth', digitsOnly(e.currentTarget.value, 2))}
              error={!!errors.expiryMonth}
            />
            <TextInput
              label="Expiry Year"
              placeholder="YY"
              maxLength={FIELD_MAX_LENGTH.creditCardExpiry}
              withAsterisk
              style={{ width: 100 }}
              value={values.expiryYear}
              onChange={(e: ChangeEvent<HTMLInputElement>) => set('expiryYear', digitsOnly(e.currentTarget.value, 2))}
              error={!!errors.expiryYear}
            />
          </Group>
          <TextInput
            label="Security Number"
            placeholder="CVV"
            maxLength={FIELD_MAX_LENGTH.creditCardCVC}
            withAsterisk
            style={{ width: 120 }}
            value={values.securityNumber}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              set('securityNumber', digitsOnly(e.currentTarget.value, FIELD_MAX_LENGTH.creditCardCVC))
            }
            error={!!errors.securityNumber}
          />
          <Text size="xs" c="gray">
            £1 will be taken from your card to authenticate your card and will be automatically refunded within 5 days.
          </Text>
        </Stack>
      </Paper>

      <Divider mb="lg" />

      <Paper withBorder p="lg" m="lg" style={{ backgroundColor: 'var(--mantine-color-gray-0)' }}>
        <Stack gap="md">
          <Title order={4}>Billing Address</Title>
          <Checkbox
            label="My billing address is the same as my personal address"
            checked={sameAsPersonal}
            onChange={(e) => toggleSameAsPersonal(e.currentTarget.checked)}
          />
          <Group align="flex-end" gap="sm">
            <TextInput
              label="Postcode"
              placeholder="e.g. SW1A 1AA"
              maxLength={FIELD_MAX_LENGTH.postcode}
              withAsterisk
              style={{ flex: 1 }}
              value={values.billingPostcode}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                set('billingPostcode', formatPostcode(e.currentTarget.value))
              }
              error={!!errors.billingPostcode}
            />
            <Tooltip label="Address lookup coming soon">
              <Button variant="outline" color="blue" disabled>
                Find Address
              </Button>
            </Tooltip>
          </Group>
          <TextInput
            label="Address Line 1"
            withAsterisk
            value={values.billingLine1}
            onChange={(e: ChangeEvent<HTMLInputElement>) => set('billingLine1', e.currentTarget.value)}
            error={!!errors.billingLine1}
            maxLength={FIELD_MAX_LENGTH.addressLine1}
          />
          <TextInput
            label="Address Line 2"
            value={values.billingLine2}
            onChange={(e: ChangeEvent<HTMLInputElement>) => set('billingLine2', e.currentTarget.value)}
            maxLength={FIELD_MAX_LENGTH.addressLine2}
          />
          <TextInput
            label="Town"
            withAsterisk
            value={values.billingTown}
            onChange={(e: ChangeEvent<HTMLInputElement>) => set('billingTown', e.currentTarget.value)}
            error={!!errors.billingTown}
            maxLength={FIELD_MAX_LENGTH.city}
          />
          <TextInput
            label="County"
            withAsterisk
            value={values.billingCounty}
            onChange={(e: ChangeEvent<HTMLInputElement>) => set('billingCounty', e.currentTarget.value)}
            error={!!errors.billingCounty}
            maxLength={FIELD_MAX_LENGTH.county}
          />
        </Stack>
      </Paper>

      <Text size="xs" m="lg" ml="xl" c="gray" ta="left" maw={750}>
        Your personal information provided to us will be used for purposes of booking your appointment. To find out more
        about our promise to protecting your personal information please see our Privacy Policy. Please complete all
        fields. By clicking 'Next' you are confirming that you have read and understood the above information.
      </Text>

      <Stack m="lg" ml="xl" mr="xl" gap="xs" align="flex-start">
        <Checkbox
          labelPosition="left"
          label="I have read the Payment Terms & Conditions and consent to the collection of my £50 excess by IPRS Health on behalf of Alliance Health Group."
          checked={values.consentForPayment}
          onChange={(e) => {
            set('consentForPayment', e.currentTarget.checked);
          }}
          error={!!errors.consentForPayment}
        />
      </Stack>

      <Group justify="right" mt="xs" m="lg">
        <Button size="md" variant="outline" color="blue" onClick={() => setStep(1)}>
          Previous
        </Button>
        <Button size="md" color="blue" onClick={handleConfirm}>
          Next
        </Button>
      </Group>
    </Document>
  );
}
