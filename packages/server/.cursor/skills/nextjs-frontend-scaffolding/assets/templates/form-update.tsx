"use client"
import useUpdate[Entity] from "../../hooks/useUpdate[Entity]"
import type { [Entity] } from "../../schemas/[entity-kebab].schema"

type [Entity]FormUpdateProps = { [entity]: [Entity]; onClose: () => void }

const [Entity]FormUpdate = ({ [entity], onClose }: [Entity]FormUpdateProps) => {
  const { form, isPending } = useUpdate[Entity]({ [entity], onSuccess: onClose })

  return (
    <div className="rounded border bg-gray-50 p-4">
      <h3 className="mb-3 font-semibold">Edit [Entity]</h3>
      <form
        data-cy-update-[entity-kebab]-form="update-[entity-kebab]-form"
        onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); form.handleSubmit() }}
        className="grid gap-3"
      >
        {/* Add form.Field for each schema field; title input needs data-cy-update-[entity-kebab]-title-input="[entity-kebab]-title-input" */}
        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            data-cy-update-[entity-kebab]-cancel-btn="update-[entity-kebab]-cancel"
            onClick={onClose}
            disabled={isPending}
            className="rounded border px-3 py-1.5 text-sm hover:bg-gray-100 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            data-cy-update-[entity-kebab]-submit="update-[entity-kebab]-submit"
            disabled={isPending}
            className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isPending ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </div>
  )
}

export default [Entity]FormUpdate
