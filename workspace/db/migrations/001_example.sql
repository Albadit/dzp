-- Migration: Convert Classic template from JSX to mustache {{ }} syntax
-- The templateEngine now uses {{ company.name }}, {{#if}}, {{#each}} etc.

UPDATE templates SET styling = $TPL$<div class="w-full h-full bg-white flex flex-col gap-8">
  <div class="flex flex-col gap-4">
    <div class="flex justify-between">
      {{#if company.logo_url}}
        <img src="{{ company.logo_url }}" alt="Logo" class="h-16" />
      {{else}}
        <div class="h-16 w-32 bg-gray-200 rounded flex items-center justify-center text-gray-500 text-sm font-bold">Logo Demo</div>
      {{/if}}
      <div class="flex flex-col gap-2 text-right">
        <h2 class="text-4xl font-bold text-slate-900">{{ lang.invoiceTitle }}</h2>
        <p class="text-2xl text-slate-600 font-semibold">#{{ invoice.invoice_code }}</p>
      </div>
    </div>
    <div class="flex justify-between">
      <div class="flex flex-col">
        <h1 class="text-2xl font-bold text-gray-900">{{ company.name }}</h1>
        {{#if company.street}}<p class="text-sm text-gray-600">{{ company.street }}</p>{{/if}}
        {{#if company.city}}<p class="text-sm text-gray-600">{{ company.city }}{{#if company.zip_code}}, {{ company.zip_code }}{{/if}}</p>{{/if}}
        {{#if company.country}}<p class="text-sm text-gray-600">{{ company.country }}</p>{{/if}}
        {{#if company.email}}<p class="text-sm text-gray-600">{{ company.email }}</p>{{/if}}
        {{#if company.phone}}<p class="text-sm text-gray-600">{{ company.phone }}</p>{{/if}}
        {{#if company.vat_number}}<p class="text-sm text-gray-600"><span class="font-semibold">{{ lang.vatNumber }}:</span> {{ company.vat_number }}</p>{{/if}}
        {{#if company.coc_number}}<p class="text-sm text-gray-600"><span class="font-semibold">{{ lang.cocNumber }}:</span> {{ company.coc_number }}</p>{{/if}}
      </div>
      <div class="flex flex-col gap-1">
        {{#if invoice.issue_date}}
          <div class="flex justify-end gap-3">
            <span class="text-sm font-semibold text-gray-600">{{ lang.issueDate }}:</span>
            <span class="text-sm text-gray-900">{{ date.issue_date }}</span>
          </div>
        {{/if}}
        {{#if invoice.due_date}}
          <div class="flex justify-end gap-3">
            <span class="text-sm font-semibold text-gray-600">{{ lang.dueDate }}:</span>
            <span class="text-sm text-gray-900">{{ date.due_date }}</span>
          </div>
        {{/if}}
      </div>
    </div>
  </div>
  <hr class="border-1 border-gray-200"/>
  <div class="flex flex-col">
    <h3 class="text-xs font-bold uppercase text-gray-600">{{ lang.billTo }}:</h3>
    <p class="text-lg font-semibold text-gray-900">{{ customer.name }}</p>
    {{#if customer.street}}<p class="text-sm text-gray-600">{{ customer.street }}</p>{{/if}}
    {{#if customer.city}}<p class="text-sm text-gray-600">{{ customer.city }}</p>{{/if}}
    {{#if customer.country}}<p class="text-sm text-gray-600">{{ customer.country }}</p>{{/if}}
  </div>
  <div class="flex flex-col gap-4">
    <div class="grid grid-cols-12 border-b-2 py-3 border-slate-900">
      <div class="col-span-5 text-sm font-bold text-slate-900 uppercase">{{ lang.item }}</div>
      <div class="col-span-2 text-sm font-bold text-slate-900 uppercase text-center">{{ lang.quantity }}</div>
      <div class="col-span-2 text-sm font-bold text-slate-900 uppercase text-right">{{ lang.rate }}</div>
      <div class="col-span-3 text-sm font-bold text-slate-900 uppercase text-right">{{ lang.amount }}</div>
    </div>
    {{#each items in item}}
      <div class="grid grid-cols-12">
        <span class="col-span-5 text-slate-700">{{ item.name }}</span>
        <span class="col-span-2 text-slate-700 text-center">{{ item.quantity }}</span>
        <span class="col-span-2 text-slate-700 text-right">{{ item.fc.unit_price }}</span>
        <span class="col-span-3 text-slate-900 font-semibold text-right">{{ item.fc.amount }}</span>
      </div>
    {{/each}}
  </div>
  <div class="grid grid-cols-2 gap-8 grow content-end">
    <div class="flex flex-col gap-8">
      <div>
        <h4 class="text-sm font-bold text-gray-900">{{ lang.notes }}</h4>
        <p class="text-sm text-gray-600 whitespace-pre-line">{{ invoice.notes }}</p>
      </div>
      <div>
        <h4 class="text-sm font-bold text-gray-900">{{ lang.terms }}</h4>
        <p class="text-sm text-gray-600 whitespace-pre-line">{{ invoice.terms }}</p>
      </div>
    </div>
    <div class="flex flex-col gap-4">
      <div class="flex justify-between text-slate-700">
        <span class="font-semibold text-gray-700">{{ lang.subtotal }}:</span>
        <span class="font-semibold text-gray-900">{{ fc.subtotal_amount }}</span>
      </div>
      {{#if invoice.discount_amount}}
        <div class="flex justify-between text-slate-700">
          <span class="text-gray-700">{{ lang.discount_label }}{{#if invoice.discount_is_percent}} ({{ invoice.discount }}){{/if}}:</span>
          <span class="font-semibold text-gray-900">-{{ fc.discount_total_amount }}</span>
        </div>
      {{/if}}
      {{#if invoice.tax_amount}}
        <div class="flex justify-between text-slate-700">
          <span class="text-gray-700">{{ lang.tax_label }}{{#if invoice.tax_is_percent}} ({{ invoice.tax }}){{/if}}:</span>
          <span class="font-semibold text-gray-900">{{ fc.tax_total_amount }}</span>
        </div>
      {{/if}}
      {{#if invoice.shipping_amount}}
        <div class="flex justify-between text-slate-700">
          <span class="text-gray-700">{{ lang.shipping_label }}{{#if invoice.shipping_is_percent}} ({{ invoice.shipping }}){{/if}}:</span>
          <span class="font-semibold text-gray-900">{{ fc.shipping_total_amount }}</span>
        </div>
      {{/if}}
      <div class="flex justify-between items-center pt-2 border-t">
        <span class="text-xl font-bold text-gray-900">{{ lang.total }}:</span>
        <span class="text-2xl font-bold text-gray-900">{{ fc.total_amount }}</span>
      </div>
    </div>
  </div>
</div>$TPL$
WHERE name = 'Classic';
